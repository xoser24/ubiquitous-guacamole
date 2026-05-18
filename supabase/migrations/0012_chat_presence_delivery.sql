-- Chat presence + delivery events + encryption-ready fields (WhatsApp-level foundations)

-- 1) Presence heartbeat: last_seen_at already added in 0011, ensure exists
alter table public.conversation_members
  add column if not exists last_seen_at timestamptz;

-- Heartbeat function: called by clients periodically (25-30s)
create or replace function public.chat_heartbeat(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  update public.conversation_members
  set last_seen_at = now()
  where conversation_id = p_conversation_id
    and user_id = auth.uid();
end $$;

-- 2) Encryption-ready message fields (no E2E yet)
alter table public.messages
  add column if not exists encrypted boolean not null default false,
  add column if not exists encryption_version int,
  add column if not exists key_version int;

-- 3) Delivery events (debuggable, analytics-friendly)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_delivery_status') then
    create type public.message_delivery_status as enum ('sent','delivered','read','failed');
  end if;
end $$;

create table if not exists public.message_delivery_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.message_delivery_status not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mde_msg_idx on public.message_delivery_events(message_id, created_at desc);
create index if not exists mde_user_idx on public.message_delivery_events(user_id, created_at desc);

alter table public.message_delivery_events enable row level security;

-- Select: sadece kendisinin eventleri + konuşma üyesiyse
drop policy if exists "mde_select_member" on public.message_delivery_events;
create policy "mde_select_member" on public.message_delivery_events for select
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.messages msg
    join public.conversation_members m on m.conversation_id = msg.conversation_id
    where msg.id = message_id and m.user_id = auth.uid()
  )
);

-- Insert: sadece kendisi için, ve konuşma üyesiyse
drop policy if exists "mde_insert_own" on public.message_delivery_events;
create policy "mde_insert_own" on public.message_delivery_events for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.messages msg
    join public.conversation_members m on m.conversation_id = msg.conversation_id
    where msg.id = message_id and m.user_id = auth.uid()
  )
);

-- 4) Helper: mark delivered/read with receipts + delivery events
create or replace function public.mark_message_delivered(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  -- receipt upsert
  insert into public.message_receipts(message_id, user_id, teslim_edildi_at, updated_at)
  values (p_message_id, auth.uid(), now(), now())
  on conflict (message_id, user_id) do update
    set teslim_edildi_at = coalesce(public.message_receipts.teslim_edildi_at, excluded.teslim_edildi_at),
        updated_at = now();

  insert into public.message_delivery_events(message_id, user_id, status)
  values (p_message_id, auth.uid(), 'delivered')
  on conflict do nothing;
end $$;

create or replace function public.mark_message_read(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.message_receipts(message_id, user_id, teslim_edildi_at, okundu_at, updated_at)
  values (p_message_id, auth.uid(), now(), now(), now())
  on conflict (message_id, user_id) do update
    set teslim_edildi_at = coalesce(public.message_receipts.teslim_edildi_at, excluded.teslim_edildi_at),
        okundu_at = now(),
        updated_at = now();

  insert into public.message_delivery_events(message_id, user_id, status)
  values (p_message_id, auth.uid(), 'read')
  on conflict do nothing;
end $$;

