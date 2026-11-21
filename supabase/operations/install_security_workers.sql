-- MANUAL: run only on the approved staging project first, after migrations 010–012.
-- Requires pg_cron, pg_net and Vault. Set Vault secrets out-of-band; never paste values here.
-- Names: way_worker_base_url (https://your-app), way_worker_cron_secret (same as server CRON_SECRET).
begin;
do $$
declare base_url text; secret text; job bigint;
begin
  if not exists(select 1 from pg_extension where extname='pg_cron')
    or not exists(select 1 from pg_extension where extname='pg_net') then
    raise exception 'Enable pg_cron and pg_net in the isolated project first';
  end if;
  select decrypted_secret into base_url from vault.decrypted_secrets where name='way_worker_base_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name='way_worker_cron_secret';
  if base_url is null or base_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?/?$'
    or secret is null or length(secret)<32 then raise exception 'Worker configuration missing or invalid'; end if;
  -- These specific names are managed by this installer; unrelated schedules are untouched.
  for job in select jobid from cron.job where jobname in ('way-moderation-worker','way-timer-worker','way-quota-cleanup') loop
    perform cron.unschedule(job);
  end loop;
  perform cron.schedule('way-moderation-worker','* * * * *',$job$
    select net.http_post(
      url := (select rtrim(decrypted_secret,'/') from vault.decrypted_secrets where name='way_worker_base_url') || '/api/moderation/worker',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',
        (select decrypted_secret from vault.decrypted_secrets where name='way_worker_cron_secret')),
      body := '{}'::jsonb, timeout_milliseconds := 55000);
  $job$);
  perform cron.schedule('way-timer-worker','* * * * *',$job$
    select net.http_post(
      url := (select rtrim(decrypted_secret,'/') from vault.decrypted_secrets where name='way_worker_base_url') || '/api/push/timer-check',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',
        (select decrypted_secret from vault.decrypted_secrets where name='way_worker_cron_secret')),
      body := '{}'::jsonb, timeout_milliseconds := 55000);
  $job$);
  perform cron.schedule('way-quota-cleanup','17 * * * *',$job$
    delete from private.rate_limits where bucket < now()-interval '48 hours';
  $job$);
end $$;
commit;
