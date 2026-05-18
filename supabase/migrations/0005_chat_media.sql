-- Sohbet medya desteği (opsiyonel ama şema hazır)

alter table public.messages
  add column if not exists medya_turu text,
  add column if not exists medya_url text;

create index if not exists messages_media_idx on public.messages(conversation_id, created_at desc) where medya_url is not null;

