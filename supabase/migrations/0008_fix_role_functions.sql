-- RLS recursion fix:
-- is_admin/is_coach/is_parent/is_student fonksiyonları profiles tablosunu okuyor.
-- Bu fonksiyonlar policies içinde de kullanıldığı için SECURITY DEFINER olmadan
-- "stack depth limit exceeded" (sonsuz RLS recursion) hatasına yol açabilir.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol = 'ogrenci'
  );
$$;

