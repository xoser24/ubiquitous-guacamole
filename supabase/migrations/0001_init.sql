-- Futbol Akademisi Yönetim Sistemi - PostgreSQL (Supabase) Şema + RLS
-- Not: Bu dosyayı Supabase SQL Editor veya supabase CLI migration olarak çalıştırın.

-- Gerekli eklentiler
create extension if not exists "pgcrypto";

-- Roller
do $$
begin
  if not exists (select 1 from pg_type where typname = 'rol') then
    create type public.rol as enum ('admin', 'antrenor', 'veli', 'ogrenci');
  end if;

  if not exists (select 1 from pg_type where typname = 'yoklama_durumu') then
    create type public.yoklama_durumu as enum ('geldi', 'gelmedi', 'izinli');
  end if;

  if not exists (select 1 from pg_type where typname = 'odeme_durumu') then
    create type public.odeme_durumu as enum ('ödendi', 'ödenmedi', 'gecikmiş', 'kısmi');
  end if;

  if not exists (select 1 from pg_type where typname = 'sohbet_turu') then
    create type public.sohbet_turu as enum ('birebir', 'grup');
  end if;

  if not exists (select 1 from pg_type where typname = 'finans_tur') then
    create type public.finans_tur as enum ('gelir', 'gider');
  end if;
end $$;

-- Yardımcı fonksiyonlar
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol = 'admin'
  );
$$;

create or replace function public.is_coach()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol = 'antrenor'
  );
$$;

create or replace function public.is_parent()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol = 'veli'
  );
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol = 'ogrenci'
  );
$$;

-- 1) Kullanıcı Profilleri (auth.users ile 1:1)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol public.rol not null default 'veli',
  ad_soyad text not null,
  telefon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_rol_idx on public.profiles(rol);

-- updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- 2) Koç / Veli / Öğrenci ilişki tabloları
create table if not exists public.coaches (
  id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.parents (
  id uuid primary key references public.profiles(id) on delete cascade,
  acil_durum_telefon text,
  created_at timestamptz not null default now()
);

-- 3) Öğrenciler
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  ad_soyad text not null,
  dogum_tarihi date not null,
  yas_grubu text not null,
  mevki text not null,
  boy_cm int,
  kilo_kg numeric(5,2),
  ayak text not null,

  coach_id uuid not null references public.coaches(id),
  parent_id uuid not null references public.parents(id),
  -- Öğrencinin kendi hesabı opsiyonel (profiles)
  student_user_id uuid references public.profiles(id),

  veli_adi text not null,
  veli_telefon text not null,
  acil_durum_numarasi text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists students_coach_idx on public.students(coach_id);
create index if not exists students_parent_idx on public.students(parent_id);
create index if not exists students_student_user_idx on public.students(student_user_id);

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at before update on public.students
for each row execute function public.set_updated_at();

-- Sağlık modülü (1:1)
create table if not exists public.student_health (
  student_id uuid primary key references public.students(id) on delete cascade,
  sakatlik_gecmisi text,
  aktif_sakatlik text,
  alerjiler text,
  saglik_notlari text,
  antrenman_kisitlamalari text,
  updated_at timestamptz not null default now()
);

-- Güncel performans (1:1)
create table if not exists public.student_performance_current (
  student_id uuid primary key references public.students(id) on delete cascade,
  hiz int not null default 50,
  sut int not null default 50,
  pas int not null default 50,
  dripling int not null default 50,
  dayaniklilik int not null default 50,
  oyun_zekasi int not null default 50,
  disiplin int not null default 50,
  updated_at timestamptz not null default now()
);

-- Haftalık takip / gelişim günlüğü
create table if not exists public.performance_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  hafta_baslangic date not null,
  hiz int not null,
  sut int not null,
  pas int not null,
  dripling int not null,
  dayaniklilik int not null,
  oyun_zekasi int not null,
  disiplin int not null,
  notu text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create unique index if not exists perf_logs_unique_week on public.performance_logs(student_id, hafta_baslangic);
create index if not exists perf_logs_student_idx on public.performance_logs(student_id);

-- Koç notları
create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  coach_id uuid not null references public.coaches(id),
  note text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_notes_student_idx on public.coach_notes(student_id);

-- 4) Antrenman oturumları
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id),
  baslik text not null,
  tarih date not null,
  saat time not null,
  konum text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists training_sessions_coach_idx on public.training_sessions(coach_id);

drop trigger if exists trg_training_sessions_updated_at on public.training_sessions;
create trigger trg_training_sessions_updated_at before update on public.training_sessions
for each row execute function public.set_updated_at();

create table if not exists public.training_session_students (
  training_session_id uuid not null references public.training_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (training_session_id, student_id)
);
create index if not exists tss_student_idx on public.training_session_students(student_id);

-- 5) Yoklama
create table if not exists public.attendance (
  training_session_id uuid not null references public.training_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  durum public.yoklama_durumu not null,
  isaretleyen_coach_id uuid not null references public.coaches(id),
  notu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (training_session_id, student_id)
);

drop trigger if exists trg_attendance_updated_at on public.attendance;
create trigger trg_attendance_updated_at before update on public.attendance
for each row execute function public.set_updated_at();

-- 6) Finans (Admin only) - Ledger
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  tur public.finans_tur not null,
  kategori text not null,
  tutar numeric(12,2) not null,
  para_birimi text not null default 'TRY',
  tarih date not null,
  aciklama text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists fin_tx_tarih_idx on public.financial_transactions(tarih);

-- Öğrenci ödeme takibi (kısmi/ödendi/gecikmiş)
create table if not exists public.student_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  donem text not null, -- YYYY-AA
  gelir_kategorisi text not null, -- Aidat, kamp, ürün, özel ders vb.
  tutar_toplam numeric(12,2) not null,
  tutar_odenen numeric(12,2) not null default 0,
  son_odeme_tarihi date not null,
  durum public.odeme_durumu not null default 'ödenmedi',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists student_payments_unique on public.student_payments(student_id, donem, gelir_kategorisi);

drop trigger if exists trg_student_payments_updated_at on public.student_payments;
create trigger trg_student_payments_updated_at before update on public.student_payments
for each row execute function public.set_updated_at();

-- 7) Sohbet
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tur public.sohbet_turu not null,
  baslik text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at before update on public.conversations
for each row execute function public.set_updated_at();

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'uye',
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conv_members_user_idx on public.conversation_members(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  metin text,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at);

-- Teslim/okundu durumları (kullanıcı bazlı)
create table if not exists public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  teslim_edildi_at timestamptz,
  okundu_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- 8) Bildirim / Token
create table if not exists public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null, -- expo/webpush
  token text not null,
  created_at timestamptz not null default now(),
  unique (platform, token)
);
create index if not exists notif_tokens_user_idx on public.notification_tokens(user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  baslik text not null,
  icerik text not null,
  veri jsonb,
  okundu boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- =========================
-- RLS (Row Level Security)
-- =========================

alter table public.profiles enable row level security;
alter table public.coaches enable row level security;
alter table public.parents enable row level security;
alter table public.students enable row level security;
alter table public.student_health enable row level security;
alter table public.student_performance_current enable row level security;
alter table public.performance_logs enable row level security;
alter table public.coach_notes enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_session_students enable row level security;
alter table public.attendance enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.student_payments enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;
alter table public.notification_tokens enable row level security;
alter table public.notifications enable row level security;

-- PROFILES: kişi kendi profilini görür/günceller, admin herkesin profilini yönetir
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (public.is_admin() or id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
using (public.is_admin() or id = auth.uid())
with check (
  public.is_admin()
  or (id = auth.uid() and rol = (select p.rol from public.profiles p where p.id = auth.uid()))
);

-- COACHES / PARENTS: admin tümünü yönetir; kullanıcı kendini okuyabilir
drop policy if exists "coaches_select" on public.coaches;
create policy "coaches_select" on public.coaches for select
using (public.is_admin() or id = auth.uid());

drop policy if exists "coaches_write_admin" on public.coaches;
create policy "coaches_write_admin" on public.coaches for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "parents_select" on public.parents;
create policy "parents_select" on public.parents for select
using (public.is_admin() or id = auth.uid());

drop policy if exists "parents_write_admin" on public.parents;
create policy "parents_write_admin" on public.parents for all
using (public.is_admin())
with check (public.is_admin());

-- STUDENTS: admin full; coach sadece kendi coach_id; parent sadece parent_id; ogrenci sadece student_user_id
drop policy if exists "students_select" on public.students;
create policy "students_select" on public.students for select
using (
  public.is_admin()
  or (public.is_coach() and coach_id = auth.uid())
  or (public.is_parent() and parent_id = auth.uid())
  or (public.is_student() and student_user_id = auth.uid())
);

drop policy if exists "students_insert_admin_or_coach" on public.students;
create policy "students_insert_admin_or_coach" on public.students for insert
with check (
  public.is_admin()
  or (public.is_coach() and coach_id = auth.uid())
);

drop policy if exists "students_update_admin_or_coach" on public.students;
create policy "students_update_admin_or_coach" on public.students for update
using (
  public.is_admin()
  or (public.is_coach() and coach_id = auth.uid())
)
with check (
  public.is_admin()
  or (public.is_coach() and coach_id = auth.uid())
);

drop policy if exists "students_delete_admin" on public.students;
create policy "students_delete_admin" on public.students for delete
using (public.is_admin());

-- STUDENT HEALTH / CURRENT PERFORMANCE: erişim öğrencinin erişimiyle aynı
drop policy if exists "student_health_select" on public.student_health;
create policy "student_health_select" on public.student_health for select
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

drop policy if exists "student_health_write_admin_or_coach" on public.student_health;
create policy "student_health_write_admin_or_coach" on public.student_health for all
using (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_id and public.is_coach() and s.coach_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_id and public.is_coach() and s.coach_id = auth.uid())
);

drop policy if exists "student_perf_current_select" on public.student_performance_current;
create policy "student_perf_current_select" on public.student_performance_current for select
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

drop policy if exists "student_perf_current_write_admin_or_coach" on public.student_performance_current;
create policy "student_perf_current_write_admin_or_coach" on public.student_performance_current for all
using (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_id and public.is_coach() and s.coach_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_id and public.is_coach() and s.coach_id = auth.uid())
);

-- PERFORMANCE LOGS + COACH NOTES
drop policy if exists "performance_logs_select" on public.performance_logs;
create policy "performance_logs_select" on public.performance_logs for select
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

drop policy if exists "performance_logs_write_admin_or_coach" on public.performance_logs;
create policy "performance_logs_write_admin_or_coach" on public.performance_logs for all
using (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_id and public.is_coach() and s.coach_id = auth.uid())
)
with check (
  public.is_admin()
  or (public.is_coach() and created_by = auth.uid()
      and exists (select 1 from public.students s where s.id = student_id and s.coach_id = auth.uid()))
);

drop policy if exists "coach_notes_select" on public.coach_notes;
create policy "coach_notes_select" on public.coach_notes for select
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

drop policy if exists "coach_notes_write_admin_or_coach" on public.coach_notes;
create policy "coach_notes_write_admin_or_coach" on public.coach_notes for all
using (
  public.is_admin()
  or (public.is_coach() and coach_id = auth.uid())
)
with check (
  public.is_admin()
  or (public.is_coach() and coach_id = auth.uid())
);

-- TRAINING SESSIONS / ASSIGNMENT
drop policy if exists "training_sessions_select" on public.training_sessions;
create policy "training_sessions_select" on public.training_sessions for select
using (
  public.is_admin()
  or (public.is_coach() and coach_id = auth.uid())
  or (public.is_parent() and exists (
      select 1
      from public.training_session_students tss
      join public.students s on s.id = tss.student_id
      where tss.training_session_id = training_sessions.id
        and s.parent_id = auth.uid()
    ))
  or (public.is_student() and exists (
      select 1
      from public.training_session_students tss
      join public.students s on s.id = tss.student_id
      where tss.training_session_id = training_sessions.id
        and s.student_user_id = auth.uid()
    ))
);

drop policy if exists "training_sessions_write_admin_or_coach" on public.training_sessions;
create policy "training_sessions_write_admin_or_coach" on public.training_sessions for all
using (public.is_admin() or (public.is_coach() and coach_id = auth.uid()))
with check (public.is_admin() or (public.is_coach() and coach_id = auth.uid()));

drop policy if exists "tss_select" on public.training_session_students;
create policy "tss_select" on public.training_session_students for select
using (
  public.is_admin()
  or exists (select 1 from public.training_sessions ts where ts.id = training_session_id and public.is_coach() and ts.coach_id = auth.uid())
  or exists (select 1 from public.students s where s.id = student_id and public.is_parent() and s.parent_id = auth.uid())
  or exists (select 1 from public.students s where s.id = student_id and public.is_student() and s.student_user_id = auth.uid())
);

drop policy if exists "tss_write_admin_or_coach" on public.training_session_students;
create policy "tss_write_admin_or_coach" on public.training_session_students for all
using (
  public.is_admin()
  or exists (select 1 from public.training_sessions ts where ts.id = training_session_id and public.is_coach() and ts.coach_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.training_sessions ts where ts.id = training_session_id and public.is_coach() and ts.coach_id = auth.uid())
);

-- ATTENDANCE: coach/admin yazabilir; parent/ogrenci okuyabilir (kendi öğrencisi)
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance for select
using (
  public.is_admin()
  or exists (select 1 from public.training_sessions ts where ts.id = training_session_id and public.is_coach() and ts.coach_id = auth.uid())
  or exists (select 1 from public.students s where s.id = student_id and public.is_parent() and s.parent_id = auth.uid())
  or exists (select 1 from public.students s where s.id = student_id and public.is_student() and s.student_user_id = auth.uid())
);

drop policy if exists "attendance_write_admin_or_coach" on public.attendance;
create policy "attendance_write_admin_or_coach" on public.attendance for all
using (
  public.is_admin()
  or exists (select 1 from public.training_sessions ts where ts.id = training_session_id and public.is_coach() and ts.coach_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.training_sessions ts where ts.id = training_session_id and public.is_coach() and ts.coach_id = auth.uid())
);

-- FINANCE: sadece admin
drop policy if exists "finance_admin_only" on public.financial_transactions;
create policy "finance_admin_only" on public.financial_transactions for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "student_payments_admin_only" on public.student_payments;
create policy "student_payments_admin_only" on public.student_payments for all
using (public.is_admin())
with check (public.is_admin());

-- CHAT: sadece üye olanlar
drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member" on public.conversations for select
using (public.is_admin() or exists (select 1 from public.conversation_members m where m.conversation_id = id and m.user_id = auth.uid()));

drop policy if exists "conversations_write_member" on public.conversations;
create policy "conversations_write_member" on public.conversations for insert
with check (auth.uid() = created_by);

drop policy if exists "conversation_members_select_member" on public.conversation_members;
create policy "conversation_members_select_member" on public.conversation_members for select
using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid())
);

drop policy if exists "conversation_members_write_owner_or_admin" on public.conversation_members;
create policy "conversation_members_write_owner_or_admin" on public.conversation_members for all
using (
  public.is_admin()
  or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid())
);

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member" on public.messages for select
using (public.is_admin() or exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid()));

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member" on public.messages for insert
with check (
  sender_id = auth.uid()
  and exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid())
);

drop policy if exists "message_receipts_select_member" on public.message_receipts;
create policy "message_receipts_select_member" on public.message_receipts for select
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.messages msg
    join public.conversation_members m on m.conversation_id = msg.conversation_id
    where msg.id = message_id and m.user_id = auth.uid()
  )
);

drop policy if exists "message_receipts_upsert_own" on public.message_receipts;
create policy "message_receipts_upsert_own" on public.message_receipts for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- NOTIFICATIONS: token/notification sadece kendisi, admin okuyamaz (gerekirse ayrı admin ekranı eklenir)
drop policy if exists "notification_tokens_own" on public.notification_tokens;
create policy "notification_tokens_own" on public.notification_tokens for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select
using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
