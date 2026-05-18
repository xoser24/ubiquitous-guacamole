-- Finans sistemi genişletme: dekont + admin onay akışı
-- Mevcut: student_payments (borç/ödeme takibi), financial_transactions (defter)
-- Yeni: payment_submissions (veli/öğrenci ödeme bildirimi + dekont) + admin onay fonksiyonu

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_submission_status') then
    create type public.payment_submission_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table if not exists public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  student_payment_id uuid not null references public.student_payments(id) on delete cascade,
  payer_user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_at date not null default current_date,
  receipt_path text not null, -- storage object path (bucket: dekontlar)
  receipt_mime text,
  receipt_size int,
  note text,
  status public.payment_submission_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_submissions_payment_idx on public.payment_submissions(student_payment_id, created_at desc);
create index if not exists payment_submissions_status_idx on public.payment_submissions(status, created_at desc);
create index if not exists payment_submissions_payer_idx on public.payment_submissions(payer_user_id, created_at desc);

alter table public.payment_submissions enable row level security;

drop trigger if exists trg_payment_submissions_updated_at on public.payment_submissions;
create trigger trg_payment_submissions_updated_at before update on public.payment_submissions
for each row execute function public.set_updated_at();

-- bucket: dekontlar (private)
-- Not: Supabase Storage şeması 'storage' altında.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('dekontlar', 'dekontlar', false)
    on conflict (id) do nothing;
  end if;
end $$;

-- RLS: admin full access
drop policy if exists "payment_submissions_admin_all" on public.payment_submissions;
create policy "payment_submissions_admin_all" on public.payment_submissions
for all
using (public.is_admin())
with check (public.is_admin());

-- RLS: payer can select own submissions
drop policy if exists "payment_submissions_select_own" on public.payment_submissions;
create policy "payment_submissions_select_own" on public.payment_submissions
for select
using (payer_user_id = auth.uid());

-- RLS: parent/student can insert only for their own student_payment
drop policy if exists "payment_submissions_insert_owner" on public.payment_submissions;
create policy "payment_submissions_insert_owner" on public.payment_submissions
for insert
with check (
  payer_user_id = auth.uid()
  and exists (
    select 1
    from public.student_payments sp
    join public.students st on st.id = sp.student_id
    where sp.id = student_payment_id
      and (
        (public.is_parent() and st.parent_id = auth.uid())
        or (public.is_student() and st.student_user_id = auth.uid())
      )
  )
);

-- yardımcı: ödeme durumunu yeniden hesapla
create or replace function public.recompute_student_payment_status(p_total numeric, p_paid numeric, p_due date)
returns public.odeme_durumu
language plpgsql
stable
as $$
begin
  if p_paid >= p_total then
    return 'ödendi';
  elsif p_paid > 0 and p_paid < p_total then
    return 'kısmi';
  elsif p_due < current_date then
    return 'gecikmiş';
  else
    return 'ödenmedi';
  end if;
end $$;

-- Admin onay/red fonksiyonu:
-- - submission status günceller
-- - onay ise student_payments.tutar_odenen artırır + durum günceller
-- - onay ise financial_transactions'a gelir kaydı düşer
-- - veli/öğrenciye bildirim yollar
create or replace function public.review_payment_submission(
  p_submission_id uuid,
  p_admin_id uuid,
  p_action text, -- 'approve' | 'reject'
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  sub record;
  sp record;
  st record;
  new_paid numeric;
  new_status public.odeme_durumu;
begin
  if p_action not in ('approve','reject') then
    raise exception 'invalid action';
  end if;

  select * into sub
  from public.payment_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'submission not found';
  end if;

  if sub.status <> 'pending' then
    raise exception 'already reviewed';
  end if;

  update public.payment_submissions
  set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      review_note = p_note
  where id = p_submission_id;

  select * into sp
  from public.student_payments
  where id = sub.student_payment_id
  for update;

  select * into st
  from public.students
  where id = sp.student_id;

  if p_action = 'approve' then
    new_paid := coalesce(sp.tutar_odenen,0) + coalesce(sub.amount,0);
    new_status := public.recompute_student_payment_status(sp.tutar_toplam, new_paid, sp.son_odeme_tarihi);

    update public.student_payments
    set tutar_odenen = new_paid,
        durum = new_status,
        created_by = p_admin_id
    where id = sp.id;

    insert into public.financial_transactions(tur, kategori, tutar, para_birimi, tarih, aciklama, created_by)
    values (
      'gelir',
      sp.gelir_kategorisi,
      sub.amount,
      'TRY',
      sub.paid_at,
      format('Ödeme onayı: %s (%s) - %s', st.ad_soyad, sp.donem, sp.gelir_kategorisi),
      p_admin_id
    );

    -- Bildirim: veli + (varsa) öğrenci kullanıcısı
    if st.parent_id is not null then
      insert into public.notifications(user_id, baslik, icerik, veri)
      values (
        st.parent_id,
        'Ödeme Onaylandı',
        format('%s (%s) ödemeniz onaylandı. Teşekkürler.', sp.gelir_kategorisi, sp.donem),
        jsonb_build_object('tur','odeme_onay','student_payment_id', sp.id::text, 'submission_id', sub.id::text)
      );
    end if;
    if st.student_user_id is not null then
      insert into public.notifications(user_id, baslik, icerik, veri)
      values (
        st.student_user_id,
        'Ödeme Onaylandı',
        format('%s (%s) ödemeniz onaylandı.', sp.gelir_kategorisi, sp.donem),
        jsonb_build_object('tur','odeme_onay','student_payment_id', sp.id::text, 'submission_id', sub.id::text)
      );
    end if;
  else
    -- RED bildirimi
    if st.parent_id is not null then
      insert into public.notifications(user_id, baslik, icerik, veri)
      values (
        st.parent_id,
        'Ödeme Reddedildi',
        coalesce(p_note, 'Ödeme bildiriminiz reddedildi. Lütfen dekontu kontrol edip tekrar gönderin.'),
        jsonb_build_object('tur','odeme_red','student_payment_id', sp.id::text, 'submission_id', sub.id::text)
      );
    end if;
    if st.student_user_id is not null then
      insert into public.notifications(user_id, baslik, icerik, veri)
      values (
        st.student_user_id,
        'Ödeme Reddedildi',
        coalesce(p_note, 'Ödeme bildiriminiz reddedildi.'),
        jsonb_build_object('tur','odeme_red','student_payment_id', sp.id::text, 'submission_id', sub.id::text)
      );
    end if;
  end if;
end $$;

