# FINAL_DEPLOYMENT (Vercel + Supabase)

## 1) Vercel Proje
- Repo’yu Vercel’e bağla
- Framework: Next.js
- Root: `apps/web`

## 2) Environment Variables (Vercel)

Zorunlu:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Sadece server-side:
- `SUPABASE_SERVICE_ROLE_KEY`

WhatsApp (opsiyonel):
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET` (imza doğrulama için önerilir)
- `WHATSAPP_DISPATCH_SECRET` (dispatch endpoint koruması için önerilir)

## 3) Supabase SQL Migrations
Supabase SQL Editor’da sırayla çalıştır:
- `supabase/migrations/0001_init.sql` (eğer proje sıfırdan kurulacaksa)
- `...` (mevcut proje için sadece yeni eklenenler)
- `supabase/migrations/0009_whatsapp_integration.sql`
- `supabase/migrations/0010_security_audit.sql`

## 4) Cron / Otomasyon

Önerilen:
- Günlük/saatsel: `generate_whatsapp_reminders()` çalıştır (Supabase Scheduled Trigger / pg_cron)
- Her 1-5 dk: `POST /api/whatsapp/dispatch` (cron)  
  - Header: `x-dispatch-secret: <WHATSAPP_DISPATCH_SECRET>`

## 5) Smoke Test Checklist
- `/giris` login
- `/` dashboard
- `/ogrenciler` liste
- `/antrenmanlar` + yoklama
- `/finans` (admin-only)
- `/sohbet` mesaj gönder
- `/admin` + kullanıcı oluştur
- `/admin/whatsapp` queue dispatch (token varsa)

