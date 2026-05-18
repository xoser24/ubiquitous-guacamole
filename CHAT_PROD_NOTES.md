# Chat Production Notları (Sohbet)

## DB Migrations
WhatsApp-level chat için şu migration’lar önemlidir:
- `0011_chat_hardening.sql` (unread, rate limit, pagination index)
- `0012_chat_presence_delivery.sql` (heartbeat/presence + delivery events + encryption-ready alanlar)

## Presence
- Client 25–30 sn aralıkla `chat_heartbeat(conversation_id)` çağırır.
- Online kuralı: `last_seen_at` son 45 sn içindeyse çevrimiçi sayılır.

## Spam/Abuse Önleme
- DB-level rate limit: `chat_can_send()` policy içine gömülü (20 msg / 60 sn).
- UI tarafı: typing throttling + duplicate event prevention.

## Delivery / Read
- İstemci yeni mesaj aldığında `mark_message_delivered` + `mark_message_read` çağırır.
- Bu eventler `message_delivery_events` tablosuna loglanır ve `message_receipts` güncellenir.

## Medya (Güvenli Upload)
- Endpoint: `POST /api/chat/media/upload-url`
- Sadece: `image/jpeg`, `image/png`, `image/webp`
- Max: 5 MB
- Bucket: `chat-media` (Supabase Storage’da oluşturulmalı)

## Test Akışı
1. İki farklı kullanıcı ile giriş yap (veli + antrenör gibi)
2. Aynı konuşmaya gir
3. Mesaj gönder → karşı tarafta anında görünmeli
4. Çok hızlı mesaj atmayı dene → DB rate limit devreye girmeli
5. 45 sn bekle → “son görülme” / çevrimdışı görmeli

