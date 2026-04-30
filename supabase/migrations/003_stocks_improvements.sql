-- ============================================================
-- Migration 003: stocks RLS で target 側からも見えるようにする
-- Supabase ダッシュボード > SQL Editor で実行してください
-- ============================================================

-- 相思相愛の検出に必要。target_user_id = auth.uid() の行も SELECT できるようにする
create policy "stocks_select_as_target" on public.stocks
  for select using (auth.uid() = target_user_id);

-- bookmarks も同様に target 側から見えるようにする（将来の通知に使用）
create policy "bookmarks_select_as_target" on public.bookmarks
  for select using (auth.uid() = target_user_id);
