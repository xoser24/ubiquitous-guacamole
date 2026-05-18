-- Bildirim hatırlatıcıları (SQL fonksiyonu). Zamanlamak için Supabase Scheduled Triggers / pg_cron kullanılabilir.

create or replace function public.generate_reminders()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  s record;
  p record;
begin
  -- 1) Yarınki antrenmanlar için veli + öğrenci bildirimleri
  for s in
    select ts.id as training_session_id, ts.baslik, ts.tarih, ts.saat, ts.konum, tss.student_id
    from public.training_sessions ts
    join public.training_session_students tss on tss.training_session_id = ts.id
    where ts.tarih = (current_date + 1)
  loop
    -- öğrenci ve veli kullanıcı id’leri
    perform 1;
    insert into public.notifications(user_id, baslik, icerik, veri)
    select st.parent_id,
      'Antrenman Hatırlatması',
      format('%s: %s %s - %s', s.baslik, s.tarih, s.saat, s.konum),
      jsonb_build_object('tur','antrenman_hatirlatma','training_session_id', s.training_session_id::text)
    from public.students st
    where st.id = s.student_id;

    insert into public.notifications(user_id, baslik, icerik, veri)
    select st.student_user_id,
      'Antrenman Hatırlatması',
      format('%s: %s %s - %s', s.baslik, s.tarih, s.saat, s.konum),
      jsonb_build_object('tur','antrenman_hatirlatma','training_session_id', s.training_session_id::text)
    from public.students st
    where st.id = s.student_id and st.student_user_id is not null;
  end loop;

  -- 2) Gecikmiş / yaklaşan ödemeler (admin-only tablo; service/cron ile çalıştırılır)
  for p in
    select sp.id, sp.student_id, sp.donem, sp.gelir_kategorisi, sp.tutar_toplam, sp.tutar_odenen, sp.son_odeme_tarihi, sp.durum
    from public.student_payments sp
    where sp.durum in ('ödenmedi','kısmi') and sp.son_odeme_tarihi <= current_date
  loop
    insert into public.notifications(user_id, baslik, icerik, veri)
    select st.parent_id,
      'Ödeme Hatırlatması',
      format('%s (%s) ödeme bekleniyor. Son tarih: %s', p.gelir_kategorisi, p.donem, p.son_odeme_tarihi),
      jsonb_build_object('tur','odeme_hatirlatma','student_payment_id', p.id::text)
    from public.students st
    where st.id = p.student_id;
  end loop;
end $$;
