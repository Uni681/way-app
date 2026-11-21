-- Operator-only, read-only diagnostics. No message bodies, auth tokens or subscriptions.
select state, count(*), min(available_at) as oldest_available_at
from private.moderation_jobs group by state;
select count(*) as overdue_leases from private.moderation_jobs
where state='processing' and lease_until < now();
select outcome, count(*) from private.push_deliveries group by outcome;
select jobname, active from cron.job
where jobname in ('way-moderation-worker','way-timer-worker','way-quota-cleanup');
-- pg_net request success is NOT proof of HTTP success. Check recent status codes too.
select id, status_code, timed_out, created from net._http_response
order by created desc limit 20;
