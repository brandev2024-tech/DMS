-- =============================================================================
-- DMS phone app — Expo push tokens (the only database change the app needs)
-- Run after 0001/0002 in the Supabase SQL editor. Safe to re-run.
-- Existing tables are not changed.
-- =============================================================================

create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  token       text not null unique,             -- "ExponentPushToken[…]"
  platform    text not null check (platform in ('ios', 'android')),
  created_at  timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Users only see and manage their own devices. Notifications are sent by the
-- push-message Edge Function, which runs on the server with the service role.
drop policy if exists "push_tokens: own" on public.push_tokens;
create policy "push_tokens: own" on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Saves this phone's token for the signed-in user. A phone that was used by a
-- different account before is moved over to the current one (otherwise the
-- previous account would keep getting this phone's notifications).
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_token !~ '^Expo(nent)?PushToken\[.+\]$' or p_platform not in ('ios', 'android') then
    raise exception 'Invalid push token';
  end if;
  insert into public.push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, created_at = now();
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
