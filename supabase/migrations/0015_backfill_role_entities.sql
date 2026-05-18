-- Backfill: mevcut profiles kayıtlarına göre coaches/parents tablolarını tamamla
-- Problem: training_sessions/attendance FK olarak coaches(id) kullandığı için,
-- profiles.rol='antrenor' olup coaches tablosunda satırı olmayan kullanıcılar antrenman/yoklama yapamaz.

insert into public.coaches(id)
select p.id
from public.profiles p
where p.rol = 'antrenor'
  and not exists (select 1 from public.coaches c where c.id = p.id);

insert into public.parents(id)
select p.id
from public.profiles p
where p.rol = 'veli'
  and not exists (select 1 from public.parents r where r.id = p.id);

-- Güvenlik: rolü değişmiş ama tabloda kalan satırları temizle (idempotent)
delete from public.coaches c
where not exists (select 1 from public.profiles p where p.id = c.id and p.rol = 'antrenor');

delete from public.parents r
where not exists (select 1 from public.profiles p where p.id = r.id and p.rol = 'veli');

