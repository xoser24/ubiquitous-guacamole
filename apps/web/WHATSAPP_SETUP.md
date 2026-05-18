# WhatsApp (Meta Cloud API) Kurulum

Bu proje, **WhatsApp mesajlarını DB kuyruğuna (outbox)** yazar ve server tarafında bir **dispatcher** ile gönderir.

## 1) Veritabanı

Supabase SQL Editor’da şu migration’ı çalıştır:

- `supabase/migrations/0009_whatsapp_integration.sql`

Bu migration şunları ekler:
- `public.whatsapp_outbox` (gönderim kuyruğu)
- `public.whatsapp_inbox` (webhook log)
- telefon normalize fonksiyonu
- yoklama trigger’ı (gelmedi/izinli → outbox)
- `public.generate_whatsapp_reminders()` (yarınki antrenman + gecikmiş ödeme hatırlatmaları)

## 2) Web uygulaması ENV

`apps/web/.env.local` içine ekle (değerler gizli):

```bash
WHATSAPP_TOKEN=...               # Meta Cloud API access token
WHATSAPP_PHONE_NUMBER_ID=...     # WhatsApp phone_number_id
WHATSAPP_VERIFY_TOKEN=...        # webhook verify için kendi belirlediğin token
```

> Not: WhatsApp Business Platform’da bazı durumlarda (24 saat penceresi dışı) **template** mesaj gerekir.
Şu an kod “text mesaj” gönderir; template desteğini istersen ekleriz.

## 3) Webhook (isteğe bağlı ama önerilir)

Meta Developer Console’da WhatsApp Webhook callback URL:

```
https://<domain>/api/whatsapp/webhook
```

Verify Token alanına:
```
WHATSAPP_VERIFY_TOKEN
```

Localhost’ta webhook için ngrok gibi bir tünel gerekir.

## 4) Dispatcher (gönderim)

Outbox’taki `pending` mesajları göndermek için:

- Admin panel: `/admin/whatsapp` → **“Kuyruğu Gönder”**
- Ya da API ile: `POST /api/whatsapp/dispatch`

Üretimde otomatik çalışması için bir cron ile (örn. her 1-5 dakikada bir) `POST /api/whatsapp/dispatch` çağırılır.

## 5) Tetikleyiciler

Hazır tetikler:
- **Yoklama**: `attendance` insert/update (durum: `gelmedi|izinli`)
- **Antrenman hatırlatma**: `generate_whatsapp_reminders()` → yarınki antrenmanlar
- **Ödeme gecikmesi/ödenmedi**: `generate_whatsapp_reminders()` → `son_odeme_tarihi <= today` ve durum `ödenmedi|kısmi|gecikmiş`

