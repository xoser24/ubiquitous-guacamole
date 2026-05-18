# Futbol Akademisi Yönetim Sistemi (Supabase/PostgreSQL + Next.js + Expo)

Bu proje **gerçek PostgreSQL (Supabase)** üzerinde çalışan, **RLS (Row Level Security) ile veritabanı seviyesinde izolasyon** sağlayan futbol akademisi yönetim sistemidir.

Arayüz metinleri **tamamen Türkçe** olacak şekilde hazırlanır.

## 1) Supabase kurulumu

1. Supabase → Yeni proje oluşturun
2. Projenin **SQL Editor** bölümünde şu migration dosyalarını sırayla çalıştırın:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_triggers.sql`
   - `supabase/migrations/0003_timeline.sql`
   - `supabase/migrations/0004_finance_events.sql`
   - `supabase/migrations/0005_chat_media.sql`
   - `supabase/migrations/0006_notifications_reminders.sql`
   - `supabase/migrations/0007_profiles_visibility.sql`

> Not: Bu dosyalar tabloları + RLS politikalarını + otomatik trigger’ları kurar.

## 2) İlk Admin (bootstrap)

1. Supabase Authentication → “Users” → Yeni kullanıcı oluşturun (ör. `admin@...`)
2. SQL Editor’da ilgili kullanıcının `profiles` kaydını admin yapın:

```sql
update public.profiles
set rol = 'admin'
where id = 'KULLANICI_UUID';
```

> `KULLANICI_UUID` değeri Supabase Auth kullanıcı id’sidir.

## 3) Web uygulaması (Next.js)

### Ortam değişkenleri

`apps/web/.env.example` → `apps/web/.env.local` oluşturun:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; Admin işlemleri için)

> Not: `SUPABASE_SERVICE_ROLE_KEY` admin panelindeki kullanıcı oluşturma ve toplu duyuru endpoint’leri için zorunludur.

### Çalıştırma

```bash
cd apps/web
npm install
npm run dev
```

## 4) Mobil uygulama (Expo)

`apps/mobile/.env.example` → `apps/mobile/.env` oluşturun:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Çalıştırma:

```bash
cd apps/mobile
npm install
npm run start
```

## 4) Production deploy (Vercel)

1. Vercel’e bağlayın (repo kökü: `futbol-akademi-supabase/apps/web`)
2. Vercel “Environment Variables” alanına `.env.local` değerlerini girin
3. Deploy edin

## 5) Veritabanı güvenliği (kritik)

Bu proje DB seviyesinde şu kuralı zorunlu kılar:

- **Antrenörler sadece kendi `coach_id`’lerine bağlı öğrencileri görebilir.**
- Veliler sadece kendi çocuklarını görebilir.
- Öğrenciler sadece kendi profilini görebilir.
- Finans verileri **sadece Admin**.

Bu izolasyon **UI ile değil**, doğrudan **PostgreSQL RLS** ile uygulanır.
