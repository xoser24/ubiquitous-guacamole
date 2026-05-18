-- Security & Stability: audit logs, rate limiting, failed login tracking

do $$
begin
  if not exists (select 1 from pg_type where typname = 'audit_severity') then
    create type public.audit_severity as enum ('info','warning','critical');
  end if;
end $$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  severity public.audit_severity not null default 'info',
  action text not null,
  entity text,
  entity_id text,
  ip text,
  user_agent text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action, created_at desc);

alter table public.audit_logs enable row level security;
drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin" on public.audit_logs
for select using (public.is_admin());

-- DB üstünden rate limit (serverless uyumlu)
create table if not exists public.rate_limit_buckets (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);
create index if not exists rate_limit_window_idx on public.rate_limit_buckets(window_start);

alter table public.rate_limit_buckets enable row level security;
drop policy if exists "rate_limit_admin_only" on public.rate_limit_buckets;
create policy "rate_limit_admin_only" on public.rate_limit_buckets
for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  ws timestamptz;
  ok boolean;
begin
  if p_key is null or p_key = '' then
    return true;
  end if;

  ws := date_trunc('second', now()) - make_interval(secs => (extract(epoch from now())::int % p_window_seconds));

  insert into public.rate_limit_buckets(key, window_start, count)
  values (p_key, ws, 1)
  on conflict (key) do update
    set count =
      case when public.rate_limit_buckets.window_start = ws
        then public.rate_limit_buckets.count + 1
        else 1
      end,
      window_start =
      case when public.rate_limit_buckets.window_start = ws
        then public.rate_limit_buckets.window_start
        else ws
      end;

  select (count <= p_limit) into ok
  from public.rate_limit_buckets
  where key = p_key;

  return coalesce(ok, true);
end $$;

-- Login denemeleri (başarısız giriş izleme)
create table if not exists public.auth_login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text,
  ip text,
  user_agent text,
  success boolean not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists auth_login_attempts_created_idx on public.auth_login_attempts(created_at desc);
create index if not exists auth_login_attempts_email_idx on public.auth_login_attempts(email, created_at desc);
create index if not exists auth_login_attempts_ip_idx on public.auth_login_attempts(ip, created_at desc);

alter table public.auth_login_attempts enable row level security;
drop policy if exists "auth_login_attempts_select_admin" on public.auth_login_attempts;
create policy "auth_login_attempts_select_admin" on public.auth_login_attempts
for select using (public.is_admin());

-- Audit log insert (server routes çağırır) - actor auth.uid() üstünden alınır
create or replace function public.audit_log(
  p_action text,
  p_entity text default null,
  p_entity_id text default null,
  p_severity public.audit_severity default 'info',
  p_ip text default null,
  p_user_agent text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.audit_logs(actor_id, action, entity, entity_id, severity, ip, user_agent, meta)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_severity, p_ip, p_user_agent, coalesce(p_meta,'{}'::jsonb));
end $$;

