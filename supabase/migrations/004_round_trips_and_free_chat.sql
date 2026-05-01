-- ============================================================
-- Migration 004: 往復カウント・完走・30回自由チャット・図鑑 RLS
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================================


-- ── 1. 人間図鑑 RLS 追加 ──────────────────────────────────────
-- クライアントから自分のエントリーを書けるようにする
create policy "zukan_insert" on public.zukan_entries
  for insert with check (auth.uid() = user_id);

create policy "zukan_update" on public.zukan_entries
  for update using (auth.uid() = user_id);


-- ── 2. 完走時に図鑑を更新する関数 ────────────────────────────
-- messages トリガーから呼ばれる。SECURITY DEFINER で RLS をバイパス
create or replace function public.update_zukan_on_completion(p_chat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat     chats%rowtype;
  v_p1       profiles%rowtype;
  v_p2       profiles%rowtype;
begin
  select * into v_chat from chats where id = p_chat_id;
  select * into v_p1   from profiles where id = v_chat.user1_id;
  select * into v_p2   from profiles where id = v_chat.user2_id;

  -- user1 の図鑑に user2 の成分を追加
  if v_p2.occupation is not null then
    insert into zukan_entries (user_id, tag_type, tag_value, count)
    values (v_chat.user1_id, 'occupation', v_p2.occupation, 1)
    on conflict (user_id, tag_type, tag_value) do update set count = zukan_entries.count + 1;
  end if;
  if v_p2.mbti is not null then
    insert into zukan_entries (user_id, tag_type, tag_value, count)
    values (v_chat.user1_id, 'mbti', v_p2.mbti, 1)
    on conflict (user_id, tag_type, tag_value) do update set count = zukan_entries.count + 1;
  end if;
  if v_p2.interest_1 is not null then
    insert into zukan_entries (user_id, tag_type, tag_value, count)
    values (v_chat.user1_id, 'interest', v_p2.interest_1, 1)
    on conflict (user_id, tag_type, tag_value) do update set count = zukan_entries.count + 1;
  end if;
  if v_p2.interest_2 is not null then
    insert into zukan_entries (user_id, tag_type, tag_value, count)
    values (v_chat.user1_id, 'interest', v_p2.interest_2, 1)
    on conflict (user_id, tag_type, tag_value) do update set count = zukan_entries.count + 1;
  end if;

  -- user2 の図鑑に user1 の成分を追加
  if v_p1.occupation is not null then
    insert into zukan_entries (user_id, tag_type, tag_value, count)
    values (v_chat.user2_id, 'occupation', v_p1.occupation, 1)
    on conflict (user_id, tag_type, tag_value) do update set count = zukan_entries.count + 1;
  end if;
  if v_p1.mbti is not null then
    insert into zukan_entries (user_id, tag_type, tag_value, count)
    values (v_chat.user2_id, 'mbti', v_p1.mbti, 1)
    on conflict (user_id, tag_type, tag_value) do update set count = zukan_entries.count + 1;
  end if;
  if v_p1.interest_1 is not null then
    insert into zukan_entries (user_id, tag_type, tag_value, count)
    values (v_chat.user2_id, 'interest', v_p1.interest_1, 1)
    on conflict (user_id, tag_type, tag_value) do update set count = zukan_entries.count + 1;
  end if;
  if v_p1.interest_2 is not null then
    insert into zukan_entries (user_id, tag_type, tag_value, count)
    values (v_chat.user2_id, 'interest', v_p1.interest_2, 1)
    on conflict (user_id, tag_type, tag_value) do update set count = zukan_entries.count + 1;
  end if;
end;
$$;


-- ── 3. メッセージ INSERT トリガー（往復カウント・完走判定） ────
create or replace function public.on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_sender    uuid;
  v_new_trip_count int;
begin
  -- 直前のメッセージの送信者を取得（同じチャット内）
  select sender_id into v_prev_sender
  from messages
  where chat_id = new.chat_id
    and id != new.id
    and is_deleted = false
  order by created_at desc
  limit 1;

  -- 送信者が交代したら往復数をインクリメント
  if v_prev_sender is not null and v_prev_sender != new.sender_id then
    update chats
    set round_trip_count = round_trip_count + 1
    where id = new.chat_id
    returning round_trip_count into v_new_trip_count;

    -- 20往復で完走 → 図鑑を更新
    if v_new_trip_count = 20 then
      perform public.update_zukan_on_completion(new.chat_id);
    end if;
  end if;

  return new;
end;
$$;

-- 既存トリガーがあれば一旦削除してから作成
drop trigger if exists on_message_insert on public.messages;

create trigger on_message_insert
  after insert on public.messages
  for each row
  execute function public.on_message_insert();


-- ── 4. match_voice を更新: encounter_number + 30回目で freed ──
create or replace function public.match_voice(p_voice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voice        voices%rowtype;
  v_chat_id      uuid;
  v_encounter_num int;
  v_is_freed     boolean := false;
begin
  -- 待機中の声をロック
  select * into v_voice
  from voices
  where id = p_voice_id and status = 'waiting'
  for update skip locked;

  if not found then
    return jsonb_build_object('error', 'voice_not_available');
  end if;

  if v_voice.user_id = auth.uid() then
    return jsonb_build_object('error', 'cannot_match_own_voice');
  end if;

  -- この2人の過去のチャット数 + 1 = 今回の出会い回数
  select count(*) + 1 into v_encounter_num
  from chats
  where (user1_id = v_voice.user_id and user2_id = auth.uid())
     or (user1_id = auth.uid()       and user2_id = v_voice.user_id);

  -- 30回目以降は自由チャット
  if v_encounter_num >= 30 then
    v_is_freed := true;
  end if;

  -- チャット作成
  insert into chats (
    user1_id, user2_id, voice_id,
    encounter_number,
    status,
    freed_at
  )
  values (
    v_voice.user_id, auth.uid(), p_voice_id,
    v_encounter_num,
    case when v_is_freed then 'freed'::chat_status else 'active'::chat_status end,
    case when v_is_freed then now() else null end
  )
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

revoke all on function public.match_voice(uuid) from public;
grant execute on function public.match_voice(uuid) to authenticated;
