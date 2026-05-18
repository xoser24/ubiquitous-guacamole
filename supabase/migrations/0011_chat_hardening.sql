-- Chat hardening (production):
-- - message spam/rate limiting (DB-level)
-- - unread counters + last_seen
-- - pagination helpers
-- - extra indexes

-- 1) Conversation member metadata
alter table public.conversation_members
  add column if not exists last_read_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists unread_count int not null default 0;

create index if not exists conv_members_conv_idx on public.conversation_members(conversation_id);
create index if not exists conv_members_unread_idx on public.conversation_members(user_id, unread_count desc);

-- 2) Messages: indexes for pagination (conv + created_at + id)
create index if not exists messages_conv_created_idx on public.messages(conversation_id, created_at desc, id);

-- 3) DB-level rate limit helper (reuses rate_limit_buckets from 0010 if exists)
create or replace function public.chat_can_send(p_user_id uuid, p_conversation_id uuid, p_limit int default 20, p_window_seconds int default 60)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  ok boolean;
begin
  -- Üyelik kontrolü
  if not exists (
    select 1 from public.conversation_members m
    where m.conversation_id = p_conversation_id and m.user_id = p_user_id
  ) then
    return false;
  end if;

  -- rate_limit_buckets tablosu yoksa (migration uygulanmadıysa) engelleme yapma
  if to_regclass('public.rate_limit_buckets') is null then
    return true;
  end if;

  select public.check_rate_limit(
    format('chat:send:%s:%s', p_conversation_id::text, p_user_id::text),
    p_limit,
    p_window_seconds
  )
  into ok;

  return coalesce(ok, true);
end $$;

-- 4) Trigger: new message -> unread_count increment for other members
create or replace function public.trg_chat_unread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  update public.conversation_members m
  set unread_count = unread_count + 1
  where m.conversation_id = new.conversation_id
    and m.user_id <> new.sender_id;

  return new;
end $$;

drop trigger if exists trg_chat_unread_on_message on public.messages;
create trigger trg_chat_unread_on_message
after insert on public.messages
for each row execute function public.trg_chat_unread_on_message();

-- 5) Mark-as-read helper (sets last_read_at and resets unread_count)
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  update public.conversation_members
  set last_read_at = now(),
      unread_count = 0
  where conversation_id = p_conversation_id
    and user_id = auth.uid();
end $$;

-- 6) RLS hardening: prevent insert to messages if rate limit exceeded
drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member" on public.messages for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conversation_id and m.user_id = auth.uid()
  )
  and public.chat_can_send(auth.uid(), conversation_id, 20, 60)
);

