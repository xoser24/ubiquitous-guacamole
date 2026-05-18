-- Finans: immutable ledger + öğrenci ödeme olayları

-- 1) financial_transactions sadece insert/select (admin)
drop policy if exists "finance_admin_only" on public.financial_transactions;
drop policy if exists "finance_select_admin" on public.financial_transactions;
drop policy if exists "finance_insert_admin" on public.financial_transactions;

create policy "finance_select_admin" on public.financial_transactions for select
using (public.is_admin());

create policy "finance_insert_admin" on public.financial_transactions for insert
with check (public.is_admin());

-- update/delete policy yok

-- 2) öğrenci ödeme olayları (immutable log)
create table if not exists public.student_payment_events (
  id uuid primary key default gen_random_uuid(),
  student_payment_id uuid not null references public.student_payments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  tur text not null, -- 'olusturuldu', 'guncellendi', 'tahsilat'
  once jsonb,
  sonra jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists student_payment_events_payment_idx on public.student_payment_events(student_payment_id, created_at desc);
create index if not exists student_payment_events_student_idx on public.student_payment_events(student_id, created_at desc);

alter table public.student_payment_events enable row level security;

-- sadece admin okur/yazar
drop policy if exists "student_payment_events_admin_only" on public.student_payment_events;
create policy "student_payment_events_admin_only" on public.student_payment_events for all
using (public.is_admin())
with check (public.is_admin());

create or replace function public.log_student_payment_event()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.student_payment_events(student_payment_id, student_id, tur, once, sonra, created_by)
    values (new.id, new.student_id, 'olusturuldu', null, to_jsonb(new), new.created_by);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    insert into public.student_payment_events(student_payment_id, student_id, tur, once, sonra, created_by)
    values (new.id, new.student_id, 'guncellendi', to_jsonb(old), to_jsonb(new), new.created_by);
    return new;
  end if;

  return new;
end $$;

drop trigger if exists trg_student_payments_events on public.student_payments;
create trigger trg_student_payments_events
after insert or update on public.student_payments
for each row execute function public.log_student_payment_event();
