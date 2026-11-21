-- Apply in a maintenance window, after 009. No external calls or cron installation here.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;

create table private.rate_limits (
  scope text not null, subject text not null, bucket timestamptz not null,
  hits integer not null, primary key(scope, subject, bucket)
);
-- Internal only. Concurrent upserts serialize quota consumption. Fixed windows are intentional.
create function private.take_quota(p_scope text, p_subject text, p_seconds int, p_limit int)
returns void language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into private.rate_limits values
    (p_scope, p_subject, to_timestamp(floor(extract(epoch from now()) / p_seconds) * p_seconds), 1)
  on conflict(scope, subject, bucket) do update set hits = private.rate_limits.hits + 1
  returning hits into n;
  if n > p_limit then raise exception 'rate_limit_exceeded' using errcode = 'P0001'; end if;
end; $$;
revoke all on function private.take_quota(text,text,int,int) from public, anon, authenticated;

alter table public.messages add column moderation_state text not null default 'queued'
  check (moderation_state in ('queued','processing','retry','held','done'));
alter table public.messages add column moderated_at timestamptz;
alter table public.messages add column moderation_counted boolean not null default false;
-- Historical messages already affected counters. Re-review them without counting twice.
update public.messages set moderation_counted = true,
  moderation_state = case when is_deleted or ban_check_status in ('flagged','banned') then 'done' else 'queued' end;
-- Old passed flags are not trusted: prior versions allowed caller-controlled verdicts.
update public.messages set ban_check_status = 'pending' where not is_deleted
  and ban_check_status in ('passed','pending');

create table private.moderation_jobs (
  message_id uuid primary key references public.messages(id) on delete cascade,
  state text not null default 'queued' check(state in ('queued','processing','retry','held','done')),
  attempts int not null default 0, available_at timestamptz not null default now(),
  lease_token uuid, lease_until timestamptz,
  last_error text check(last_error in ('provider_failure','lease_expired') or last_error is null)
);
create index moderation_jobs_leases on private.moderation_jobs(lease_until) where state='processing';
create index moderation_jobs_ready on private.moderation_jobs(available_at, message_id)
  where state in ('queued','retry');

create function private.enqueue_moderation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.take_quota('message_minute', new.sender_id::text, 60, 10);
  perform private.take_quota('message_hour', new.sender_id::text, 3600, 100);
  insert into private.moderation_jobs(message_id) values (new.id);
  return new;
end; $$;
create trigger enqueue_moderation after insert on public.messages
  for each row execute function private.enqueue_moderation();
insert into private.moderation_jobs(message_id)
  select id from public.messages where ban_check_status = 'pending' and not is_deleted;

-- A restrictive policy also protects against accidentally retained permissive SELECT policies.
create policy messages_moderation_gate on public.messages as restrictive for select to authenticated
  using (sender_id = auth.uid() or (ban_check_status = 'passed' and not is_deleted));
revoke all on public.messages from public, anon;
-- Old WAL row images must not contain hidden text when visibility changes.
alter table public.messages replica identity default;

create function public.claim_moderation(p_message_id uuid default null)
returns table(message_id uuid, content text, lease_token uuid)
language plpgsql security definer set search_path = '' as $$
declare job private.moderation_jobs%rowtype; tok uuid;
begin
  -- No automatic takeover of an uncertain in-flight provider request.
  with expired as (
    update private.moderation_jobs set state='held', lease_token=null, last_error='lease_expired'
      where state='processing' and lease_until < now() returning private.moderation_jobs.message_id
  ) update public.messages set moderation_state='held' where id in (select expired.message_id from expired);
  select j.* into job from private.moderation_jobs j
    join public.messages m on m.id=j.message_id
    where j.state in ('queued','retry') and j.available_at <= now() and j.attempts < 3
      and m.ban_check_status='pending' and not m.is_deleted
      and (p_message_id is null or j.message_id=p_message_id)
    order by j.available_at, j.message_id for update of j skip locked limit 1;
  if not found then return; end if;
  perform private.take_quota('ai_global_minute', 'all', 60, 60);
  tok := gen_random_uuid();
  update private.moderation_jobs set state='processing', attempts=attempts+1,
    lease_token=tok, lease_until=now()+interval '2 minutes' where private.moderation_jobs.message_id=job.message_id;
  update public.messages set moderation_state='processing' where id=job.message_id;
  return query select m.id, m.content, tok from public.messages m where m.id=job.message_id;
end; $$;

create function public.finish_moderation(p_message_id uuid, p_lease_token uuid, p_verdict text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare job private.moderation_jobs%rowtype; next_state text;
begin
  select * into job from private.moderation_jobs where message_id=p_message_id for update;
  if not found or job.state <> 'processing' or job.lease_token is distinct from p_lease_token
    or job.lease_until < now() then return false; end if;
  if p_verdict not in ('SAFE','FLAGGED','ERROR','HOLD') or p_verdict is null then
    raise exception 'invalid_verdict';
  end if;
  if p_verdict in ('ERROR','HOLD') then
    next_state := case when p_verdict='HOLD' or job.attempts >= 3 then 'held' else 'retry' end;
    update private.moderation_jobs set state=next_state, lease_token=null, lease_until=null,
      last_error='provider_failure', available_at=now()+make_interval(secs => 30 * (2 ^ (job.attempts-1))::int)
      where message_id=p_message_id;
    update public.messages set moderation_state=next_state where id=p_message_id;
  else
    update public.messages set ban_check_status=case when p_verdict='SAFE' then 'passed'::public.ban_check_status
      else 'flagged'::public.ban_check_status end, ban_check_layer=2,
      is_deleted=(p_verdict='FLAGGED'), moderation_state='done'
      where id=p_message_id and ban_check_status='pending' and not is_deleted;
    if not found then return false; end if;
    update private.moderation_jobs set state='done', lease_token=null, lease_until=null, last_error=null
      where message_id=p_message_id;
  end if;
  return true;
end; $$;

-- Requeue only after an operator has confirmed no previous worker/provider request remains.
create function public.retry_held_moderation(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update private.moderation_jobs set state='queued', attempts=0, available_at=now(),
    lease_token=null, lease_until=null, last_error=null where message_id=p_message_id and state='held';
  if not found then return false; end if;
  update public.messages set moderation_state='queued' where id=p_message_id and ban_check_status='pending';
  return true;
end; $$;

-- Count accepted messages only, once, in acceptance order under a chat row lock.
drop trigger if exists on_message_insert on public.messages;
create function private.count_accepted_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare prev_sender uuid; trips int;
begin
  if new.ban_check_status <> 'passed' or new.is_deleted then return new; end if;
  perform 1 from public.chats where id=new.chat_id for update;
  new.moderated_at := clock_timestamp();
  if old.moderation_counted then return new; end if;
  select sender_id into prev_sender from public.messages
    where chat_id=new.chat_id and id<>new.id and moderation_counted and ban_check_status='passed' and not is_deleted
    order by moderated_at desc nulls last, created_at desc, id desc limit 1;
  if prev_sender is not null and prev_sender<>new.sender_id then
    update public.chats set round_trip_count=round_trip_count+1 where id=new.chat_id returning round_trip_count into trips;
    if trips=20 then perform public.update_zukan_on_completion(new.chat_id); end if;
  end if;
  new.moderation_counted := true;
  return new;
end; $$;
create trigger count_accepted_message before update of ban_check_status on public.messages
  for each row when (old.ban_check_status is distinct from new.ban_check_status)
  execute function private.count_accepted_message();

revoke all on function public.claim_moderation(uuid), public.finish_moderation(uuid,uuid,text),
  public.retry_held_moderation(uuid) from public, anon, authenticated;
grant execute on function public.claim_moderation(uuid), public.finish_moderation(uuid,uuid,text),
  public.retry_held_moderation(uuid) to service_role;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
commit;
