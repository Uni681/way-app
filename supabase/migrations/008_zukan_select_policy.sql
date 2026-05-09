-- Migration 008: zukan_entries に SELECT ポリシーを追加
-- 自分のエントリーだけ読み取れるようにする（INSERT/UPDATE は 004 で定義済み）
create policy "zukan_select" on public.zukan_entries
  for select using (auth.uid() = user_id);
