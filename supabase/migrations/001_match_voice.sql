-- ============================================================
-- match_voice: 声に乗る（マッチング）のアトミック処理
-- Supabaseダッシュボード > SQL Editor で実行してください
-- ============================================================

create or replace function public.match_voice(p_voice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voice  voices%rowtype;
  v_chat_id uuid;
begin
  -- 待機中の声をロック（同時マッチ防止）
  select * into v_voice
  from voices
  where id = p_voice_id and status = 'waiting'
  for update skip locked;

  if not found then
    return jsonb_build_object('error', 'voice_not_available');
  end if;

  -- 自分の声には乗れない
  if v_voice.user_id = auth.uid() then
    return jsonb_build_object('error', 'cannot_match_own_voice');
  end if;

  -- チャット作成
  insert into chats (user1_id, user2_id, voice_id)
  values (v_voice.user_id, auth.uid(), p_voice_id)
  returning id into v_chat_id;

  -- 声のステータスを更新
  update voices
  set status     = 'matched',
      matched_at = now(),
      chat_id    = v_chat_id
  where id = p_voice_id;

  return jsonb_build_object('chat_id', v_chat_id);
end;
$$;

-- 認証済みユーザーのみ実行可能
revoke all on function public.match_voice(uuid) from public;
grant execute on function public.match_voice(uuid) to authenticated;
