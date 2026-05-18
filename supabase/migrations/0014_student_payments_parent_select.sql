-- Veli/Öğrenci aidat takibi için student_payments SELECT izni (yazma yine admin-only)

-- Eski "student_payments_admin_only" policy'sini parçalı hale getiriyoruz.
drop policy if exists "student_payments_admin_only" on public.student_payments;

-- Select: admin + ilgili veli + ilgili öğrenci
drop policy if exists "student_payments_select" on public.student_payments;
create policy "student_payments_select" on public.student_payments for select
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

-- Write (insert/update/delete): sadece admin
drop policy if exists "student_payments_write_admin" on public.student_payments;
create policy "student_payments_write_admin" on public.student_payments for all
using (public.is_admin())
with check (public.is_admin());

