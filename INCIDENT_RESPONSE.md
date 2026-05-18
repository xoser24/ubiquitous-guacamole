# INCIDENT_RESPONSE (Kısa Runbook)

## 1) Olay Türleri
- Yetkisiz erişim / veri sızıntısı şüphesi
- Hesap ele geçirme / brute-force
- Realtime spam / sohbet suistimali
- WhatsApp webhook/queue suistimali
- Finans verisi manipülasyonu şüphesi

## 2) İlk 15 Dakika
1. Etkiyi sınırla:
   - Gerekirse Vercel’de deploy’u “pause” et / bakım sayfası
   - Şüpheli API route’larında rate limit’i artır / geçici blok
2. Kanıt topla:
   - `audit_logs` (action/ip/ua) incele
   - `auth_login_attempts` başarısız giriş patlaması var mı?
   - Supabase Logs + Realtime Logs kontrol et
3. Ana riski belirle:
   - Admin aksiyonları mı? (rol değişimi, kullanıcı oluşturma)
   - Finans insert/update var mı?

## 3) Müdahale
- Şüpheli kullanıcıları devre dışı bırak (Supabase Auth: ban/disable)
- Şifre sıfırlama zorunlu kıl
- `WHATSAPP_TOKEN` / `WHATSAPP_APP_SECRET` şüphesi varsa token rotate
- Supabase service_role anahtarını rotate et (en kritik)

## 4) İyileştirme
- Açık tespit edilirse: policy/endpoint harden
- Ek audit eventleri ekle
- Rate limit kuralını sıkılaştır

## 5) İletişim
- Akademi yöneticisine olay özeti (ne oldu, etki, aksiyon, sonraki adım)

