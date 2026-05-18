-- Otomatik ilişki kayıtları (profiles role -> coaches/parents) ve öğrenci 1:1 tabloları

create or replace function public.sync_role_entities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- coaches
  if new.rol = 'antrenor' then
    insert into public.coaches(id) values (new.id)
    on conflict (id) do nothing;
  else
    delete from public.coaches where id = new.id;
  end if;

  -- parents
  if new.rol = 'veli' then
    insert into public.parents(id) values (new.id)
    on conflict (id) do nothing;
  else
    delete from public.parents where id = new.id;
  end if;

  return new;
end $$;

drop trigger if exists trg_profiles_sync_role_entities on public.profiles;
create trigger trg_profiles_sync_role_entities
after insert or update of rol on public.profiles
for each row execute function public.sync_role_entities();

create or replace function public.init_student_modules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_health(student_id) values (new.id)
  on conflict (student_id) do nothing;

  insert into public.student_performance_current(student_id) values (new.id)
  on conflict (student_id) do nothing;

  return new;
end $$;

drop trigger if exists trg_students_init_modules on public.students;
create trigger trg_students_init_modules
after insert on public.students
for each row execute function public.init_student_modules();

