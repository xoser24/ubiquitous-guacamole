-- Profillerin kontrollü görünürlüğü (chat + öğrenci ilişkileri için gerekli)

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_select_related_or_admin" on public.profiles;

create policy "profiles_select_related_or_admin"
on public.profiles for select
using (
  public.is_admin()
  or id = auth.uid()
  or exists (
    -- aynı sohbetin üyesi
    select 1
    from public.conversation_members m1
    join public.conversation_members m2 on m2.conversation_id = m1.conversation_id
    where m1.user_id = auth.uid() and m2.user_id = profiles.id
  )
  or exists (
    -- öğrenci üzerinden ilişki (koç/veli/öğrenci)
    select 1
    from public.students s
    where (
      (s.coach_id = auth.uid() and (s.parent_id = profiles.id or s.student_user_id = profiles.id))
      or (s.parent_id = auth.uid() and (s.coach_id = profiles.id or s.student_user_id = profiles.id))
      or (s.student_user_id = auth.uid() and (s.coach_id = profiles.id or s.parent_id = profiles.id))
    )
  )
);
