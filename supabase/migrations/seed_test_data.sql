-- ============================================================
-- WAY テスト用ダミーデータ
-- Supabase Dashboard > SQL Editor に貼り付けて実行してください
-- ============================================================

DO $$
DECLARE
  my_user_id   uuid := '6dcb7c54-de93-40c0-8364-dfdfbfee077a';
  test_user_id uuid := '98c27759-592c-4453-8edb-bd6332f14c26';
  chat_created timestamptz;
  trips        int;
  i            int;
BEGIN

  -- ── 1. テストユーザー作成 ──────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id,
    aud, role,
    email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin,
    created_at, updated_at
  ) VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'test.tanuki@way.test', '',
    now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false,
    now() - interval '6 months', now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.profiles (
    id, codename,
    occupation, mbti, interest_1, interest_2,
    rules_accepted_at
  ) VALUES (
    test_user_id,
    '夜明けのタヌキ',
    'エンジニア', 'INFP',
    '音楽（聴く）', '読書',
    now() - interval '6 months'
  ) ON CONFLICT DO NOTHING;

  -- ── 2. 相思相愛ストック（双方向） ─────────────────────────
  INSERT INTO public.stocks (user_id, target_user_id)
    VALUES (my_user_id, test_user_id)
    ON CONFLICT DO NOTHING;

  INSERT INTO public.stocks (user_id, target_user_id)
    VALUES (test_user_id, my_user_id)
    ON CONFLICT DO NOTHING;

  -- ── 3. 24回分のチャット ────────────────────────────────────
  FOR i IN 1..24 LOOP
    chat_created := now()
      - ((25 - i) * 7 || ' days')::interval
      + (floor(random() * 3) || ' days')::interval;

    IF i % 3 = 0 THEN
      trips := 20 + floor(random() * 12)::int;
    ELSIF i % 3 = 1 THEN
      trips := 8  + floor(random() * 10)::int;
    ELSE
      trips := 1  + floor(random() *  6)::int;
    END IF;

    INSERT INTO public.chats (
      user1_id, user2_id,
      status, expires_at,
      round_trip_count, encounter_number,
      created_at
    ) VALUES (
      CASE WHEN i % 2 = 0 THEN my_user_id   ELSE test_user_id END,
      CASE WHEN i % 2 = 0 THEN test_user_id  ELSE my_user_id  END,
      'expired',
      chat_created + interval '24 hours',
      trips,
      i,
      chat_created
    );
  END LOOP;

  -- ── 4. 人間図鑑エントリー ─────────────────────────────────
  INSERT INTO public.zukan_entries (user_id, tag_type, tag_value, count) VALUES
    (my_user_id, 'occupation', 'エンジニア',    8),
    (my_user_id, 'occupation', 'デザイナー',    3),
    (my_user_id, 'occupation', '学生',          2),
    (my_user_id, 'occupation', 'フリーランス',  2),
    (my_user_id, 'occupation', '医師',          1),
    (my_user_id, 'mbti', 'INFP',               5),
    (my_user_id, 'mbti', 'ENFJ',               2),
    (my_user_id, 'mbti', 'INTJ',               1),
    (my_user_id, 'mbti', 'INFJ',               1),
    (my_user_id, 'interest', '音楽（聴く）',    6),
    (my_user_id, 'interest', '読書',            4),
    (my_user_id, 'interest', '映画',            3),
    (my_user_id, 'interest', 'ゲーム',          2),
    (my_user_id, 'interest', 'アニメ',          2),
    (my_user_id, 'interest', '筋トレ',          1)
  ON CONFLICT (user_id, tag_type, tag_value)
    DO UPDATE SET count = EXCLUDED.count;

  RAISE NOTICE '✓ 完了: チャット24件・ストック・図鑑を挿入しました';

END $$;


-- ============================================================
-- 確認クエリ（投入後に別途実行）
-- ============================================================

-- SELECT codename, occupation, mbti FROM public.profiles
--   WHERE id = '98c27759-592c-4453-8edb-bd6332f14c26';

-- SELECT count(*), min(created_at), max(created_at) FROM public.chats
--   WHERE user1_id IN ('6dcb7c54-de93-40c0-8364-dfdfbfee077a','98c27759-592c-4453-8edb-bd6332f14c26')
--     AND user2_id IN ('6dcb7c54-de93-40c0-8364-dfdfbfee077a','98c27759-592c-4453-8edb-bd6332f14c26');

-- SELECT tag_type, tag_value, count FROM public.zukan_entries
--   WHERE user_id = '6dcb7c54-de93-40c0-8364-dfdfbfee077a'
--   ORDER BY tag_type, count DESC;


-- ============================================================
-- リセット（やり直す場合のみ実行）
-- ============================================================

-- DELETE FROM public.chats
--   WHERE user1_id IN ('6dcb7c54-de93-40c0-8364-dfdfbfee077a','98c27759-592c-4453-8edb-bd6332f14c26')
--     AND user2_id IN ('6dcb7c54-de93-40c0-8364-dfdfbfee077a','98c27759-592c-4453-8edb-bd6332f14c26');
-- DELETE FROM public.stocks
--   WHERE user_id IN ('6dcb7c54-de93-40c0-8364-dfdfbfee077a','98c27759-592c-4453-8edb-bd6332f14c26');
-- DELETE FROM public.zukan_entries
--   WHERE user_id = '6dcb7c54-de93-40c0-8364-dfdfbfee077a';
-- DELETE FROM public.profiles WHERE id = '98c27759-592c-4453-8edb-bd6332f14c26';
-- DELETE FROM auth.users   WHERE id = '98c27759-592c-4453-8edb-bd6332f14c26';
