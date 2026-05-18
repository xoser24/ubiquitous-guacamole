-- Performans: finans/tahsilat ekranları için index iyileştirmeleri

-- student_payments: gecikmiş/yaklaşan sorguları hızlandır
create index if not exists student_payments_due_idx on public.student_payments(son_odeme_tarihi);
create index if not exists student_payments_status_due_idx on public.student_payments(durum, son_odeme_tarihi);
create index if not exists student_payments_student_due_idx on public.student_payments(student_id, son_odeme_tarihi);

-- payment_submissions: onay/pending listeleri
create index if not exists payment_submissions_status_paid_idx on public.payment_submissions(status, paid_at);

-- whatsapp_outbox: jsonb related alanında student_id filtreleri (contains) için
create index if not exists whatsapp_outbox_related_gin on public.whatsapp_outbox using gin (related);

