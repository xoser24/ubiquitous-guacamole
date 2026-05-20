-- Finans: öğrenci bağlantısı + aidat ayarları (vade günü, aylık tutar)

-- 1) Öğrenci bazlı aidat ayarları
alter table public.students
  add column if not exists aidat_vade_gunu smallint;

alter table public.students
  add column if not exists aylik_aidat_tutar numeric(12,2);

do $$
begin
  -- check constraint (1-28) ekle (varsa dokunma)
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_aidat_vade_gunu_chk'
  ) then
    alter table public.students
      add constraint students_aidat_vade_gunu_chk
      check (aidat_vade_gunu is null or (aidat_vade_gunu between 1 and 28));
  end if;
end $$;

-- 2) Gelir/Gider defter kayıtlarını öğrenciye bağlayabilmek için
alter table public.financial_transactions
  add column if not exists student_id uuid references public.students(id);

create index if not exists fin_tx_student_idx on public.financial_transactions(student_id);

