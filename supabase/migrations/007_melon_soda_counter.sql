-- 007_melon_soda_counter.sql
-- もらったメロンソーダのカウンターをprofilesに追加

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS melon_soda_received integer NOT NULL DEFAULT 0;

-- 送信者がチャット相手のカウンターをインクリメントするRPC関数
-- SECURITY DEFINER で実行されるため、送信者は相手のプロフィールを直接更新できる
-- ただし「同じチャットにいる相手のみ」という制約を内部で持つ
CREATE OR REPLACE FUNCTION public.increment_melon_soda_received(target_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET melon_soda_received = melon_soda_received + 1
  WHERE id = target_user_id
    AND EXISTS (
      SELECT 1 FROM public.chats
      WHERE (user1_id = auth.uid() AND user2_id = target_user_id)
         OR (user1_id = target_user_id AND user2_id = auth.uid())
    );
$$;

GRANT EXECUTE ON FUNCTION public.increment_melon_soda_received(uuid) TO authenticated;
