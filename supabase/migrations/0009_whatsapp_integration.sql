-- WhatsApp (Meta Cloud API) entegrasyonu
-- Amaç: Yoklama / Antrenman hatırlatma / Ödeme gecikmesi için veli + öğrenciye (toplu) mesaj kuyruğu.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'whatsapp_status') then
    create type public.whatsapp_status as enum ('pending','sent','failed');
  end if;
end $$;

create table if not exists public.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null,
  to_user_id uuid references public.profiles(id) on delete set null,
  to_phone text not null,
  tur text not null, -- 'yoklama','antrenman_hatirlatma','odeme_hatirlatma','duyuru' vb.
  message_type text not null default 'text', -- 'text' | 'template'
  text_body text,
  template_name text,
  template_language text default 'tr',
  template_components jsonb,
  related jsonb not null default '{}'::jsonb,
  status public.whatsapp_status not null default 'pending',
  attempt_count int not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create unique index if not exists whatsapp_outbox_dedupe_idx on public.whatsapp_outbox(dedupe_key);
create index if not exists whatsapp_outbox_status_idx on public.whatsapp_outbox(status, created_at);
create index if not exists whatsapp_outbox_user_idx on public.whatsapp_outbox(to_user_id);

create table if not exists public.whatsapp_inbox (
  id uuid primary key default gen_random_uuid(),
  wa_message_id text,
  from_phone text,
  message_type text,
  text_body text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- RLS: sadece admin okuyabilsin (log ekranı için)
alter table public.whatsapp_outbox enable row level security;
alter table public.whatsapp_inbox enable row level security;

drop policy if exists "whatsapp_outbox_select_admin" on public.whatsapp_outbox;
create policy "whatsapp_outbox_select_admin" on public.whatsapp_outbox
for select using (public.is_admin());

drop policy if exists "whatsapp_inbox_select_admin" on public.whatsapp_inbox;
create policy "whatsapp_inbox_select_admin" on public.whatsapp_inbox
for select using (public.is_admin());

-- Telefon normalize (TR odaklı)
create or replace function public.normalize_phone(raw text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  if raw is null then
    return null;
  end if;

  -- sadece rakamları al
  d := regexp_replace(raw, '[^0-9]', '', 'g');
  if d = '' then
    return null;
  end if;

  -- 0 ile başlayan 11 haneli TR numarası: 0XXXXXXXXXX -> +90XXXXXXXXXX
  if length(d) = 11 and left(d, 1) = '0' then
    d := '90' || substring(d from 2);
  end if;

  -- 10 haneli yazıldıysa (5xxxxxxxxx): +90 ekle
  if length(d) = 10 then
    d := '90' || d;
  end if;

  return '+' || d;
end $$;

-- Tek kullanıcıya WhatsApp kuyruğu
create or replace function public.enqueue_whatsapp_to_user(
  p_user_id uuid,
  p_fallback_phone text,
  p_tur text,
  p_text text,
  p_dedupe_key text,
  p_related jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  phone_raw text;
  phone_norm text;
begin
  select telefon into phone_raw from public.profiles where id = p_user_id;
  if phone_raw is null or phone_raw = '' then
    phone_raw := p_fallback_phone;
  end if;

  phone_norm := public.normalize_phone(phone_raw);
  if phone_norm is null then
    return;
  end if;

  insert into public.whatsapp_outbox(dedupe_key, to_user_id, to_phone, tur, message_type, text_body, related)
  values (p_dedupe_key, p_user_id, phone_norm, p_tur, 'text', p_text, coalesce(p_related,'{}'::jsonb))
  on conflict (dedupe_key) do nothing;
end $$;

-- Öğrenci -> veli + öğrenci (ikisi)
create or replace function public.enqueue_whatsapp_to_student(
  p_student_id uuid,
  p_tur text,
  p_text text,
  p_dedupe_prefix text,
  p_related jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  st record;
begin
  select id, parent_id, student_user_id, veli_telefon
  into st
  from public.students
  where id = p_student_id;

  if not found then
    return;
  end if;

  -- veli
  perform public.enqueue_whatsapp_to_user(
    st.parent_id,
    st.veli_telefon,
    p_tur,
    p_text,
    p_dedupe_prefix || ':parent',
    jsonb_set(coalesce(p_related,'{}'::jsonb), '{student_id}', to_jsonb(p_student_id::text), true)
  );

  -- öğrenci (opsiyonel hesabı varsa)
  if st.student_user_id is not null then
    perform public.enqueue_whatsapp_to_user(
      st.student_user_id,
      null,
      p_tur,
      p_text,
      p_dedupe_prefix || ':student',
      jsonb_set(coalesce(p_related,'{}'::jsonb), '{student_id}', to_jsonb(p_student_id::text), true)
    );
  end if;
end $$;

-- 1) Yarınki antrenman + 2) Ödeme gecikmiş/ödenmedi (generate_reminders benzeri)
create or replace function public.generate_whatsapp_reminders()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  s record;
  p record;
  msg text;
begin
  -- Antrenman: yarın
  for s in
    select ts.id as training_session_id, ts.baslik, ts.tarih, ts.saat, ts.konum, tss.student_id
    from public.training_sessions ts
    join public.training_session_students tss on tss.training_session_id = ts.id
    where ts.tarih = (current_date + 1)
  loop
    msg := format('🏋️ Antrenman Hatırlatması: %s | %s %s | %s', s.baslik, s.tarih, s.saat, s.konum);
    perform public.enqueue_whatsapp_to_student(
      s.student_id,
      'antrenman_hatirlatma',
      msg,
      'training:' || s.training_session_id::text || ':' || s.student_id::text,
      jsonb_build_object('training_session_id', s.training_session_id::text)
    );
  end loop;

  -- Ödeme: son ödeme tarihi geçtiyse (ödenmedi/kısmi)
  for p in
    select sp.id, sp.student_id, sp.donem, sp.gelir_kategorisi, sp.son_odeme_tarihi, sp.durum
    from public.student_payments sp
    where sp.durum in ('ödenmedi','kısmi','gecikmiş') and sp.son_odeme_tarihi <= current_date
  loop
    msg := format('💳 Ödeme Hatırlatması: %s (%s) | Son tarih: %s | Durum: %s', p.gelir_kategorisi, p.donem, p.son_odeme_tarihi, p.durum);
    perform public.enqueue_whatsapp_to_student(
      p.student_id,
      'odeme_hatirlatma',
      msg,
      'payment:' || p.id::text || ':' || p.student_id::text,
      jsonb_build_object('student_payment_id', p.id::text)
    );
  end loop;
end $$;

-- Yoklama: gelmedi/izinli durumunda anlık mesaj kuyruğu
create or replace function public.trg_enqueue_whatsapp_on_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  ts record;
  st record;
  msg text;
begin
  if tg_op = 'UPDATE' and new.durum = old.durum then
    return new;
  end if;

  -- sadece gelmedi/izinli için
  if new.durum not in ('gelmedi','izinli') then
    return new;
  end if;

  select baslik, tarih, saat, konum into ts
  from public.training_sessions
  where id = new.training_session_id;

  select ad_soyad into st
  from public.students
  where id = new.student_id;

  msg := format('📌 Yoklama: %s | %s (%s %s) | Durum: %s', st.ad_soyad, ts.baslik, ts.tarih, ts.saat, new.durum);

  perform public.enqueue_whatsapp_to_student(
    new.student_id,
    'yoklama',
    msg,
    'attendance:' || new.training_session_id::text || ':' || new.student_id::text || ':' || new.durum::text,
    jsonb_build_object(
      'training_session_id', new.training_session_id::text,
      'student_id', new.student_id::text,
      'durum', new.durum::text
    )
  );

  return new;
end $$;

drop trigger if exists trg_whatsapp_attendance on public.attendance;
create trigger trg_whatsapp_attendance
after insert or update on public.attendance
for each row execute function public.trg_enqueue_whatsapp_on_attendance();

