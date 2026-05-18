-- FIX: Bazı ortamlarda financial_transactions tablosunda `para_birimi` kolonu bulunmuyor.
-- Bu nedenle review_payment_submission içinde financial_transactions insert'i para_birimi olmadan yapılır.

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
  set status = (case when p_action = 'approve' then 'approved' else 'rejected' end)::public.payment_submission_status,
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

    -- NOTE: para_birimi yok; default/currency alanı olmayan DB'lerle uyumlu.
    insert into public.financial_transactions(tur, kategori, tutar, tarih, aciklama, created_by)
    values (
      'gelir',
      sp.gelir_kategorisi,
      sub.amount,
      sub.paid_at,
      format('Ödeme onayı: %s (%s) - %s', st.ad_soyad, sp.donem, sp.gelir_kategorisi),
      p_admin_id
    );

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

