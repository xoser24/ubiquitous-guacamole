-- Güvenlik düzeltmesi: Finans tablolarında eksik kalmış RLS policy'lerini garanti altına al.
-- Amaç: Admin panelinden gelir/gider + öğrenci ödeme kayıtları düzgün yazılsın/okunsun.

-- financial_transactions
alter table public.financial_transactions enable row level security;

drop policy if exists "finance_select_admin" on public.financial_transactions;
create policy "finance_select_admin" on public.financial_transactions
for select
using (public.is_admin());

drop policy if exists "finance_insert_admin" on public.financial_transactions;
create policy "finance_insert_admin" on public.financial_transactions
for insert
with check (public.is_admin());

-- Not: Defter kayıtları normalde immutable kalmalı. Ancak panelde düzeltme ihtiyacı için admin update policy ekliyoruz.
drop policy if exists "finance_update_admin" on public.financial_transactions;
create policy "finance_update_admin" on public.financial_transactions
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "finance_delete_admin" on public.financial_transactions;
create policy "finance_delete_admin" on public.financial_transactions
for delete
using (public.is_admin());

-- student_payments (aidat/borç takibi) - admin tam erişim, veli/öğrenci sadece kendi kayıtlarını görebilir (0014 ile uyumlu)
alter table public.student_payments enable row level security;

drop policy if exists "student_payments_select" on public.student_payments;
create policy "student_payments_select" on public.student_payments
for select
using (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = student_id and public.is_parent() and s.parent_id = auth.uid()
  )
  or exists (
    select 1 from public.students s
    where s.id = student_id and public.is_student() and s.student_user_id = auth.uid()
  )
);

drop policy if exists "student_payments_write_admin" on public.student_payments;
create policy "student_payments_write_admin" on public.student_payments
for all
using (public.is_admin())
with check (public.is_admin());

