-- ============================================================
-- Realtime パブリケーションに必要なテーブルを追加
-- Supabaseダッシュボード > SQL Editor で実行してください
-- ============================================================

alter publication supabase_realtime add table public.voices;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.drink_bar_uses;
