-- Soft delete / iptal mekanizması
-- Finans: immutable yaklaşımı korunur, “silme” yerine iptal edilir (kayıt kalır, raporlardan çıkar)
-- Antrenman: “silme” yerine iptal edilir (yoklama geçmişi korunur)

-- 1) Finans defteri (ledger) iptal alanları
alter table public.financial_transactions
  add column if not exists iptal boolean not null default false,
  add column if not exists iptal_nedeni text,
  add column if not exists iptal_eden uuid references public.profiles(id),
  add column if not exists iptal_tarihi timestamptz;

create index if not exists fin_tx_iptal_idx on public.financial_transactions(iptal, tarih);

-- 2) Öğrenci borç/aidat kayıtları iptal alanları
alter table public.student_payments
  add column if not exists iptal boolean not null default false,
  add column if not exists iptal_nedeni text,
  add column if not exists iptal_eden uuid references public.profiles(id),
  add column if not exists iptal_tarihi timestamptz;

create index if not exists student_payments_iptal_idx on public.student_payments(iptal, son_odeme_tarihi);

-- 3) Antrenman oturumu iptal alanı
alter table public.training_sessions
  add column if not exists iptal boolean not null default false,
  add column if not exists iptal_nedeni text,
  add column if not exists iptal_eden uuid references public.coaches(id),
  add column if not exists iptal_tarihi timestamptz;

create index if not exists training_sessions_iptal_tarih_idx on public.training_sessions(iptal, tarih);

