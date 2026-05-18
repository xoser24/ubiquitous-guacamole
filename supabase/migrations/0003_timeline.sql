-- Öğrenci gelişim zaman çizelgesi (immutable)

create table if not exists public.student_timeline (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tur text not null, -- 'performans', 'not', 'yoklama', 'odeme', 'antrenman'
  ozet text not null,
  veri jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists student_timeline_student_idx on public.student_timeline(student_id, created_at desc);

alter table public.student_timeline enable row level security;

drop policy if exists "student_timeline_select" on public.student_timeline;
create policy "student_timeline_select" on public.student_timeline for select
using (
  exists (
    select 1 from public.students s
    where s.id = student_id
      and (
        public.is_admin()
        or (public.is_coach() and s.coach_id = auth.uid())
        or (public.is_parent() and s.parent_id = auth.uid())
        or (public.is_student() and s.student_user_id = auth.uid())
      )
  )
);

-- Zaman çizelgesi sadece insert (immutable)
drop policy if exists "student_timeline_insert_admin_or_coach" on public.student_timeline;
create policy "student_timeline_insert_admin_or_coach" on public.student_timeline for insert
with check (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_id and public.is_coach() and s.coach_id = auth.uid())
);

-- update/delete yok

-- Triggerlar: performans log, koç notu, yoklama, öğrenci ödeme güncellemesi
create or replace function public.timeline_from_performance_logs()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.student_timeline(student_id, tur, ozet, veri, created_by)
  values (
    new.student_id,
    'performans',
    'Haftalık performans kaydı eklendi.',
    jsonb_build_object(
      'hafta_baslangic', new.hafta_baslangic,
      'hiz', new.hiz, 'sut', new.sut, 'pas', new.pas, 'dripling', new.dripling,
      'dayaniklilik', new.dayaniklilik, 'oyun_zekasi', new.oyun_zekasi, 'disiplin', new.disiplin,
      'not', new.notu
    ),
    new.created_by
  );
  return new;
end $$;

drop trigger if exists trg_timeline_perf on public.performance_logs;
create trigger trg_timeline_perf
after insert on public.performance_logs
for each row execute function public.timeline_from_performance_logs();

create or replace function public.timeline_from_coach_notes()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.student_timeline(student_id, tur, ozet, veri, created_by)
  values (
    new.student_id,
    'not',
    'Antrenör notu eklendi.',
    jsonb_build_object('note', new.note),
    new.coach_id
  );
  return new;
end $$;

drop trigger if exists trg_timeline_note on public.coach_notes;
create trigger trg_timeline_note
after insert on public.coach_notes
for each row execute function public.timeline_from_coach_notes();

create or replace function public.timeline_from_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  oturum record;
begin
  select baslik, tarih, saat, konum, coach_id into oturum
  from public.training_sessions
  where id = new.training_session_id;

  insert into public.student_timeline(student_id, tur, ozet, veri, created_by)
  values (
    new.student_id,
    'yoklama',
    'Yoklama güncellendi.',
    jsonb_build_object(
      'durum', new.durum,
      'antrenman', jsonb_build_object('baslik', oturum.baslik, 'tarih', oturum.tarih, 'saat', oturum.saat, 'konum', oturum.konum)
    ),
    new.isaretleyen_coach_id
  );
  return new;
end $$;

drop trigger if exists trg_timeline_attendance on public.attendance;
create trigger trg_timeline_attendance
after insert or update on public.attendance
for each row execute function public.timeline_from_attendance();
