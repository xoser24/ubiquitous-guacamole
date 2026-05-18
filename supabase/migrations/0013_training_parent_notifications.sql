-- Antrenman planlaması: oyuncu atanınca veli/öğrenciye otomatik bildirim
-- Not: notifications tablosu RLS ile sadece kendi kullanıcılarına görünür.

create or replace function public.trg_notify_parent_on_training_assign()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  st record;
  ts record;
  content text;
begin
  select s.id, s.ad_soyad, s.parent_id, s.student_user_id
  into st
  from public.students s
  where s.id = new.student_id;

  select id, baslik, tarih, saat, konum
  into ts
  from public.training_sessions
  where id = new.training_session_id;

  if not found then
    return new;
  end if;

  content := format('%s: %s %s - %s', ts.baslik, ts.tarih, ts.saat, ts.konum);

  -- veli
  if st.parent_id is not null then
    insert into public.notifications(user_id, baslik, icerik, veri)
    values (
      st.parent_id,
      'Antrenman Planlandı',
      content,
      jsonb_build_object('tur','antrenman_planlandi','training_session_id', ts.id::text,'student_id', st.id::text)
    );
  end if;

  -- öğrenci hesabı varsa
  if st.student_user_id is not null then
    insert into public.notifications(user_id, baslik, icerik, veri)
    values (
      st.student_user_id,
      'Antrenman Planlandı',
      content,
      jsonb_build_object('tur','antrenman_planlandi','training_session_id', ts.id::text,'student_id', st.id::text)
    );
  end if;

  return new;
end $$;

drop trigger if exists trg_training_assign_notify on public.training_session_students;
create trigger trg_training_assign_notify
after insert on public.training_session_students
for each row execute function public.trg_notify_parent_on_training_assign();

