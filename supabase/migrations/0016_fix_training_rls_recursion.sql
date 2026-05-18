-- Fix: training_sessions <-> training_session_students RLS recursion
-- Önceki policy'lerde policy içinde başka RLS'li tabloya join yapıldığı için sonsuz RLS recursion oluşabiliyordu.
-- Çözüm: membership kontrollerini SECURITY DEFINER fonksiyonlara taşıyıp row_security=off ile değerlendirmek.

create or replace function public.session_belongs_to_coach(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.training_sessions ts
    where ts.id = p_session_id
      and ts.coach_id = p_user_id
  );
$$;

create or replace function public.session_has_parent(p_session_id uuid, p_parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.training_session_students tss
    join public.students s on s.id = tss.student_id
    where tss.training_session_id = p_session_id
      and s.parent_id = p_parent_id
  );
$$;

create or replace function public.session_has_student_user(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.training_session_students tss
    join public.students s on s.id = tss.student_id
    where tss.training_session_id = p_session_id
      and s.student_user_id = p_user_id
  );
$$;

-- TRAINING SESSIONS
drop policy if exists "training_sessions_select" on public.training_sessions;
create policy "training_sessions_select" on public.training_sessions for select
using (
  public.is_admin()
  or (public.is_coach() and coach_id = auth.uid())
  or (public.is_parent() and public.session_has_parent(id, auth.uid()))
  or (public.is_student() and public.session_has_student_user(id, auth.uid()))
);

drop policy if exists "training_sessions_write_admin_or_coach" on public.training_sessions;
create policy "training_sessions_write_admin_or_coach" on public.training_sessions for all
using (public.is_admin() or (public.is_coach() and coach_id = auth.uid()))
with check (public.is_admin() or (public.is_coach() and coach_id = auth.uid()));

-- TRAINING SESSION STUDENTS
drop policy if exists "tss_select" on public.training_session_students;
create policy "tss_select" on public.training_session_students for select
using (
  public.is_admin()
  or (public.is_coach() and public.session_belongs_to_coach(training_session_id, auth.uid()))
  or exists (select 1 from public.students s where s.id = student_id and public.is_parent() and s.parent_id = auth.uid())
  or exists (select 1 from public.students s where s.id = student_id and public.is_student() and s.student_user_id = auth.uid())
);

drop policy if exists "tss_write_admin_or_coach" on public.training_session_students;
create policy "tss_write_admin_or_coach" on public.training_session_students for all
using (
  public.is_admin()
  or (public.is_coach() and public.session_belongs_to_coach(training_session_id, auth.uid()))
)
with check (
  public.is_admin()
  or (public.is_coach() and public.session_belongs_to_coach(training_session_id, auth.uid()))
);

-- ATTENDANCE
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance for select
using (
  public.is_admin()
  or (public.is_coach() and public.session_belongs_to_coach(training_session_id, auth.uid()))
  or exists (select 1 from public.students s where s.id = student_id and public.is_parent() and s.parent_id = auth.uid())
  or exists (select 1 from public.students s where s.id = student_id and public.is_student() and s.student_user_id = auth.uid())
);

drop policy if exists "attendance_write_admin_or_coach" on public.attendance;
create policy "attendance_write_admin_or_coach" on public.attendance for all
using (
  public.is_admin()
  or (public.is_coach() and public.session_belongs_to_coach(training_session_id, auth.uid()))
)
with check (
  public.is_admin()
  or (public.is_coach() and public.session_belongs_to_coach(training_session_id, auth.uid()))
);

