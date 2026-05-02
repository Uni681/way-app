-- ============================================================
-- Migration 005: Web Push 通知 + Stripe サブスク
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================================


-- ── 1. push_subscriptions テーブル ────────────────────────────
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  auth       text not null,
  p256dh     text not null,
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_sub_own"
  on public.push_subscriptions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── 2. profiles にサブスクフィールドを追加 ───────────────────
alter table public.profiles
  add column if not exists subscription_status text not null default 'none'
    check (subscription_status in ('none', 'active', 'cancelled')),
  add column if not exists stripe_customer_id      text,
  add column if not exists stripe_subscription_id  text;


-- ── 3. chats に通知済みフラグを追加（タイマー1時間前通知） ──
alter table public.chats
  add column if not exists timer_notified_at timestamptz;


-- ── 4. タイマー通知用ヘルパー関数 ────────────────────────────
-- expires_at まであと1時間のチャットを返す（まだ通知していないもの）
create or replace function public.get_expiring_chats()
returns table (
  chat_id    uuid,
  user1_id   uuid,
  user2_id   uuid,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, user1_id, user2_id, expires_at
  from chats
  where status = 'active'
    and expires_at between now() + interval '55 minutes'
                       and now() + interval '65 minutes'
    and timer_notified_at is null;
$$;

-- ── 5. timer_notified_at をセットする関数 ────────────────────
create or replace function public.mark_timer_notified(p_chat_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update chats
  set timer_notified_at = now()
  where id = p_chat_id;
$$;

grant execute on function public.get_expiring_chats() to service_role;
grant execute on function public.mark_timer_notified(uuid) to service_role;


-- ── 6. pg_cron 設定（Supabase Dashboard > Database > Extensions で
--       pg_cron を有効化してから実行）
-- select cron.schedule(
--   'notify-expiring-chats',
--   '* * * * *',
--   $$ select net.http_post(
--       url    := current_setting('app.url') || '/api/push/timer-check',
--       body   := '{}',
--       headers := '{"Content-Type":"application/json","x-cron-secret":"<YOUR_CRON_SECRET>"}'
--   ) $$
-- );
