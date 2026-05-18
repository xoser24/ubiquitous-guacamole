# SECURITY_CHECKLIST (Production)

Bu checklist mevcut mimariyi bozmadan (Next.js + Supabase) production hardening için hazırlanmıştır.

## A) Supabase / DB (RLS + Yetki)

- [ ] `SUPABASE_SERVICE_ROLE_KEY` **frontend’de yok** (sadece server-side).
- [ ] RLS açık: `profiles, students, trainings, attendance, messages, financial_*` tablolarında kontrol edildi.
- [ ] `is_admin/is_coach/is_parent/is_student` fonksiyonları **SECURITY DEFINER** (RLS recursion yok).
- [ ] Admin-only tablolar (finans) için policy’ler sadece `is_admin()` ile.
- [ ] Trigger/fonksiyonlar `security definer` ise `search_path` set edilmiş.
- [ ] Kritik index’ler var (attendance, messages, tx tarih, vb.).
- [ ] Audit tabloları (0010) çalıştırıldı: `audit_logs`, `auth_login_attempts`, `rate_limit_buckets`.

## B) Auth / Session

- [ ] Giriş endpoint’i `/api/auth/giris` cookie ile session oluşturuyor.
- [ ] Başarısız giriş denemeleri kaydediliyor (`auth_login_attempts`).
- [ ] Rate limit aktif (login + admin aksiyonları).
- [ ] Şüpheli aktivite tespiti (çok sayıda başarısız giriş) için uyarı mekanizması planlandı.

## C) API Güvenliği

- [ ] Tüm `/api/*` route’ları RBAC kontrol ediyor.
- [ ] CSRF: `Origin` doğrulaması (same-origin) mutasyon route’larında aktif.
- [ ] Zod validation ile request body doğrulanıyor.
- [ ] Audit log: admin aksiyonları (kullanıcı oluşturma, duyuru, whatsapp dispatch) kayıt altına alınıyor.
- [ ] WhatsApp dispatch: `WHATSAPP_DISPATCH_SECRET` ile cron çağrıları korumalı.

## D) Realtime / Chat Abuse Prevention

- [ ] Mesaj gönderiminde rate limit (DB veya server guard).
- [ ] Sadece conversation üyesi mesaj yazabiliyor (DB/RLS).
- [ ] Presence/typing throttling (client + server).
- [ ] Unread counter/pagination (performans için).

## E) Webhook Güvenliği (WhatsApp)

- [ ] Webhook verify token aktif.
- [ ] `WHATSAPP_APP_SECRET` varsa X-Hub-Signature-256 doğrulanıyor.
- [ ] Webhook eventleri inbox’a loglanıyor.

## F) Operasyonel Güvenlik

- [ ] Prod env doğrulama (missing secrets build-time fail).
- [ ] Backup / recovery planı var.
- [ ] Incident response runbook hazır.

