-- ============================================================
-- Migration 006: プロフィール拡張（通知設定）
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================================

-- 通知設定（オプション通知の ON/OFF）
alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{
    "reunion_chance": false,
    "bookmark_reunion": false,
    "achievement_30": false,
    "stock_released": false
  }'::jsonb;
