# BACKUP_RECOVERY (Supabase)

## Hedef
Veri kaybı / bozulma durumunda hızlı geri dönüş + minimum downtime.

## 1) Backup Stratejisi

- Supabase projesinde otomatik backup (plan’a göre) aktif olmalı.
- Ek olarak:
  - Günlük `pg_dump` (schema + data) önerilir.
  - Kritik tablolar için (finans, attendance, messages) ayrı export da tutulabilir.

## 2) Recovery Adımları

1. Olay zamanını belirle (hangi saat aralığı).
2. En yakın backup snapshot’ını seç.
3. Geri yükleme sonrası kontrol:
   - Auth kullanıcıları (auth.users)
   - `profiles` eşleşmesi
   - RLS/policy’ler duruyor mu?
   - Son 24 saat finans kayıtları doğru mu?
4. Uygulama smoke test:
   - admin login
   - öğrenci listesi
   - yoklama kaydı
   - finans insert (admin)

## 3) Anahtar Rotasyonu

Recovery sonrası:
- `service_role` rotate (zorunlu öneri)
- WhatsApp token rotate (varsa)

