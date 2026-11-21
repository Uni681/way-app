begin;
-- Reserve an event before network I/O. An uncertain delivery is never replayed automatically.
create table private.push_deliveries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null, actor_id uuid, created_at timestamptz not null default now(),
  outcome text not null default 'reserved' check(outcome in ('reserved','sent','failed','no_subscription')),
  unique(user_id,event_key)
);
create function public.reserve_push(p_user_id uuid, p_event_key text, p_actor_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if p_event_key is null or length(p_event_key)>120 or p_event_key !~ '^(chat_started|mutual_stock|timer)-[0-9a-f-]{36}$' then
    raise exception 'invalid_event';
  end if;
  insert into private.push_deliveries(user_id,event_key,actor_id) values(p_user_id,p_event_key,p_actor_id)
    on conflict(user_id,event_key) do nothing returning id into result;
  if result is null then return null; end if;
  perform private.take_quota('push_global_minute', 'all', 60, 120);
  perform private.take_quota('push_recipient_minute', p_user_id::text, 60, 10);
  if p_actor_id is not null then
    perform private.take_quota('push_actor_minute', p_actor_id::text, 60, 10);
    perform private.take_quota('push_actor_hour', p_actor_id::text, 3600, 100);
  end if;
  return result;
end; $$;
create function public.finish_push(p_delivery_id uuid, p_outcome text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_outcome not in ('sent','failed','no_subscription') or p_outcome is null then raise exception 'invalid_outcome'; end if;
  update private.push_deliveries set outcome=p_outcome where id=p_delivery_id and outcome='reserved';
end; $$;
-- Limit saved subscriptions even when callers bypass Next.js and use the Data API.
create function private.limit_push_subscriptions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 41));
  perform private.take_quota('push_subscription_minute',new.user_id::text,60,5);
  if not exists(select 1 from public.push_subscriptions where user_id=new.user_id and endpoint=new.endpoint)
    and (select count(*) from public.push_subscriptions where user_id=new.user_id)>=3 then
    raise exception 'subscription_limit';
  end if;
  if new.endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|updates-autopush\.webpush\.mozgcp\.net|web\.push\.apple\.com)/'
    or length(new.endpoint)>2048 or new.auth !~ '^[A-Za-z0-9_-]{22}={0,2}$'
    or new.p256dh !~ '^[A-Za-z0-9_-]{87}={0,2}$' then raise exception 'invalid_subscription'; end if;
  return new;
end; $$;
create trigger limit_push_subscriptions before insert or update on public.push_subscriptions
  for each row execute function private.limit_push_subscriptions();
create or replace function public.get_expiring_chats()
returns table(chat_id uuid,user1_id uuid,user2_id uuid,expires_at timestamptz)
language sql security definer set search_path='' as $$
  select id,user1_id,user2_id,expires_at from public.chats
  where status='active' and expires_at between now()+interval '55 minutes' and now()+interval '65 minutes'
    and timer_notified_at is null order by expires_at,id limit 10;
$$;
revoke all on function public.reserve_push(uuid,text,uuid), public.finish_push(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_push(uuid,text,uuid), public.finish_push(uuid,text) to service_role;
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
commit;
