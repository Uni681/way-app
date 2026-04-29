-- WAY — Supabase Schema
-- Supabase の SQL Editor に貼り付けて実行してください

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- ENUMS
-- ============================================================
create type chat_status      as enum ('active', 'expired', 'freed');
create type voice_status     as enum ('waiting', 'matched', 'expired');
create type ban_check_status as enum ('pending', 'passed', 'flagged', 'banned');
create type drink_category   as enum ('free', 'emotion', 'seasonal');
create type drink_season     as enum ('spring', 'summer', 'winter', 'halloween');
create type tag_type         as enum ('occupation', 'mbti', 'interest');
create type report_status    as enum ('pending', 'reviewed', 'resolved');


-- ============================================================
-- PROFILES  (Supabase Auth の auth.users を拡張)
-- ============================================================
create table public.profiles (
  id                    uuid        primary key references auth.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  codename              text        not null unique,
  avatar_url            text,
  occupation            text,
  mbti                  text,
  interest_1            text,
  interest_2            text,
  is_subscribed         boolean     not null default false,
  subscription_expires_at timestamptz,
  is_banned             boolean     not null default false,
  ban_reason            text,
  rules_accepted_at     timestamptz,
  constraint codename_length check (char_length(codename) <= 10)
);


-- ============================================================
-- VOICES  (ユーザーが「投げる」声。マッチング待機キュー)
-- ============================================================
create table public.voices (
  id          uuid         primary key default gen_random_uuid(),
  created_at  timestamptz  not null default now(),
  expires_at  timestamptz  not null default now() + interval '24 hours',
  user_id     uuid         not null references public.profiles(id) on delete cascade,
  content     text         not null,
  status      voice_status not null default 'waiting',
  matched_at  timestamptz,
  chat_id     uuid         -- 後で chats を参照するため後付け FK
);


-- ============================================================
-- CHATS  (マッチング成立後のチャットセッション)
-- ============================================================
create table public.chats (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '24 hours',
  status           chat_status not null default 'active',
  user1_id         uuid        not null references public.profiles(id),
  user2_id         uuid        not null references public.profiles(id),
  voice_id         uuid        references public.voices(id),
  round_trip_count int         not null default 0,  -- 往復数（完走判定に使用）
  encounter_number int         not null default 1,  -- この2人の何回目の出会いか
  freed_at         timestamptz,                     -- 30回達成で解放された日時
  constraint different_users check (user1_id != user2_id)
);

-- voices → chats の循環参照を解消するための FK を後付け
alter table public.voices
  add constraint voices_chat_id_fkey
  foreign key (chat_id) references public.chats(id);


-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id               uuid             primary key default gen_random_uuid(),
  created_at       timestamptz      not null default now(),
  chat_id          uuid             not null references public.chats(id) on delete cascade,
  sender_id        uuid             not null references public.profiles(id),
  content          text             not null,
  is_deleted       boolean          not null default false,
  ban_check_status ban_check_status not null default 'pending',
  ban_check_layer  smallint         -- 1=パターン, 2=AI, 3=人間
);


-- ============================================================
-- REACTIONS  (Slack方式の絵文字リアクション)
-- ============================================================
create table public.reactions (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message_id uuid        not null references public.messages(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id),
  emoji      text        not null,
  unique (message_id, user_id, emoji)
);


-- ============================================================
-- DRINK BAR ITEMS  (マスタ)
-- ============================================================
create table public.drink_bar_items (
  id          uuid           primary key default gen_random_uuid(),
  key         text           not null unique,
  emoji       text           not null,
  name        text           not null,
  description text,
  is_free     boolean        not null default false,
  category    drink_category not null,
  season      drink_season,
  is_active   boolean        not null default true
);


-- ============================================================
-- DRINK BAR USES  (使用ログ)
-- ============================================================
create table public.drink_bar_uses (
  id        uuid        primary key default gen_random_uuid(),
  used_at   timestamptz not null default now(),
  chat_id   uuid        not null references public.chats(id) on delete cascade,
  sender_id uuid        not null references public.profiles(id),
  item_id   uuid        not null references public.drink_bar_items(id)
);


-- ============================================================
-- STOCKS  (片方のストック行動を1行で管理。相思相愛 = 双方向に行が存在)
-- ============================================================
create table public.stocks (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  target_user_id uuid        not null references public.profiles(id) on delete cascade,
  unique (user_id, target_user_id),
  constraint no_self_stock check (user_id != target_user_id)
);


-- ============================================================
-- BOOKMARKS  (印。ストック満枠時のブックマーク。履歴は保存しない)
-- ============================================================
create table public.bookmarks (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  target_user_id uuid        not null references public.profiles(id) on delete cascade,
  unique (user_id, target_user_id),
  constraint no_self_bookmark check (user_id != target_user_id)
);


-- ============================================================
-- ENCOUNTERS  (再会ガチャ用の出会い履歴)
-- ============================================================
create table public.encounters (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  chat_id          uuid        not null references public.chats(id),
  user1_id         uuid        not null references public.profiles(id),
  user2_id         uuid        not null references public.profiles(id),
  encounter_number int         not null,   -- この2人の何回目か
  ended_at         timestamptz,
  round_trip_count int         not null default 0,
  is_completed     boolean     not null default false,  -- 完走 = 20往復以上
  memo             text        -- 「会話の一言メモ」(30回達成レシート用)
);


-- ============================================================
-- ZUKAN_ENTRIES  (人間図鑑。完走ごとに相手の成分タグを加算)
-- ============================================================
create table public.zukan_entries (
  id         uuid     primary key default gen_random_uuid(),
  user_id    uuid     not null references public.profiles(id) on delete cascade,
  tag_type   tag_type not null,
  tag_value  text     not null,
  count      int      not null default 0,
  unique (user_id, tag_type, tag_value)
);


-- ============================================================
-- BAN_RECORDS
-- ============================================================
create table public.ban_records (
  id          uuid        primary key default gen_random_uuid(),
  banned_at   timestamptz not null default now(),
  user_id     uuid        not null references public.profiles(id),
  chat_id     uuid        references public.chats(id),
  message_id  uuid        references public.messages(id),
  layer       smallint    not null,  -- 1=パターン, 2=AI, 3=人間
  reason      text        not null,
  is_appealed boolean     not null default false
);


-- ============================================================
-- REPORTS  (通報)
-- ============================================================
create table public.reports (
  id               uuid          primary key default gen_random_uuid(),
  created_at       timestamptz   not null default now(),
  reporter_id      uuid          not null references public.profiles(id),
  reported_user_id uuid          not null references public.profiles(id),
  chat_id          uuid          references public.chats(id),
  message_id       uuid          references public.messages(id),
  reason           text,
  status           report_status not null default 'pending'
);


-- ============================================================
-- NOTIFICATION_SETTINGS
-- ============================================================
create table public.notification_settings (
  user_id                  uuid    primary key references public.profiles(id) on delete cascade,
  -- オプション通知（デフォルト OFF）
  stock_reunion_notify     boolean not null default false,
  bookmark_reunion_notify  boolean not null default false,
  thirty_achieved_notify   boolean not null default false,
  stock_released_notify    boolean not null default false,
  -- 深夜ミュート（デフォルト ON, 02:00〜07:00）
  quiet_hours_enabled      boolean not null default true,
  quiet_start              time    not null default '02:00',
  quiet_end                time    not null default '07:00'
);


-- ============================================================
-- INDEXES
-- ============================================================
create index on public.voices     (user_id, status);
create index on public.voices     (status, created_at);
create index on public.chats      (user1_id, status);
create index on public.chats      (user2_id, status);
create index on public.messages   (chat_id, created_at);
create index on public.messages   (sender_id);
create index on public.stocks     (user_id);
create index on public.stocks     (target_user_id);
create index on public.bookmarks  (user_id);
create index on public.encounters (user1_id, user2_id);
create index on public.encounters (chat_id);
create index on public.zukan_entries (user_id, tag_type);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles              enable row level security;
alter table public.voices                enable row level security;
alter table public.chats                 enable row level security;
alter table public.messages              enable row level security;
alter table public.reactions             enable row level security;
alter table public.drink_bar_items       enable row level security;
alter table public.drink_bar_uses        enable row level security;
alter table public.stocks                enable row level security;
alter table public.bookmarks             enable row level security;
alter table public.encounters            enable row level security;
alter table public.zukan_entries         enable row level security;
alter table public.ban_records           enable row level security;
alter table public.reports               enable row level security;
alter table public.notification_settings enable row level security;

-- profiles: 誰でも読める・自分だけ書ける
create policy "profiles_select" on public.profiles
  for select using (true);
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- voices: 自分の声だけ操作。タイムライン表示は waiting のものを全員が読める
create policy "voices_select_own" on public.voices
  for select using (auth.uid() = user_id);
create policy "voices_select_timeline" on public.voices
  for select using (status = 'waiting');
create policy "voices_insert" on public.voices
  for insert with check (auth.uid() = user_id);
create policy "voices_update" on public.voices
  for update using (auth.uid() = user_id);

-- chats: 参加者のみ
create policy "chats_select" on public.chats
  for select using (auth.uid() = user1_id or auth.uid() = user2_id);

-- messages: チャット参加者のみ
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.chats c
      where c.id = messages.chat_id
        and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );
create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
        and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
        and c.status = 'active'
    )
  );

-- reactions: チャット参加者のみ
create policy "reactions_select" on public.reactions
  for select using (
    exists (
      select 1 from public.messages m
      join public.chats c on c.id = m.chat_id
      where m.id = reactions.message_id
        and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );
create policy "reactions_insert" on public.reactions
  for insert with check (auth.uid() = user_id);
create policy "reactions_delete" on public.reactions
  for delete using (auth.uid() = user_id);

-- drink_bar_items: 全員が読める（マスタ）
create policy "drink_items_select" on public.drink_bar_items
  for select using (true);

-- drink_bar_uses: チャット参加者のみ
create policy "drink_uses_select" on public.drink_bar_uses
  for select using (
    exists (
      select 1 from public.chats c
      where c.id = drink_bar_uses.chat_id
        and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );
create policy "drink_uses_insert" on public.drink_bar_uses
  for insert with check (auth.uid() = sender_id);

-- stocks: 自分のストックのみ
create policy "stocks_select" on public.stocks
  for select using (auth.uid() = user_id);
create policy "stocks_insert" on public.stocks
  for insert with check (auth.uid() = user_id);
create policy "stocks_delete" on public.stocks
  for delete using (auth.uid() = user_id);

-- bookmarks: 自分の印のみ
create policy "bookmarks_select" on public.bookmarks
  for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on public.bookmarks
  for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete" on public.bookmarks
  for delete using (auth.uid() = user_id);

-- encounters: 参加者のみ
create policy "encounters_select" on public.encounters
  for select using (auth.uid() = user1_id or auth.uid() = user2_id);

-- zukan_entries: 自分のみ
create policy "zukan_select" on public.zukan_entries
  for select using (auth.uid() = user_id);

-- ban_records: 自分のBANログのみ
create policy "ban_records_select" on public.ban_records
  for select using (auth.uid() = user_id);

-- reports: 自分の通報のみ
create policy "reports_select" on public.reports
  for select using (auth.uid() = reporter_id);
create policy "reports_insert" on public.reports
  for insert with check (auth.uid() = reporter_id);

-- notification_settings: 自分のみ
create policy "notif_select" on public.notification_settings
  for select using (auth.uid() = user_id);
create policy "notif_insert" on public.notification_settings
  for insert with check (auth.uid() = user_id);
create policy "notif_update" on public.notification_settings
  for update using (auth.uid() = user_id);


-- ============================================================
-- SEED: DRINK BAR ITEMS
-- ============================================================
insert into public.drink_bar_items (key, emoji, name, description, is_free, category) values
  ('melon_soda',    '🍈', 'メロンソーダ', '画面全体が薄い緑にシュワシュワ。泡が湧き上がる特別演出',             true,  'free'),
  ('espresso',      '☕', 'エスプレッソ', '「ここからディープな話するわ」の合図。ヘッダー下にバーが滑り込む', true,  'free'),
  ('imo_kenpi',     '🍠', 'いもけんぴ',   '差し入れ演出',                                                        true,  'free'),
  ('cola',          '🥤', 'コーラ',       'おごり演出',                                                           true,  'free'),
  ('nemnem_daha',   '😪', '眠眠打破',     '「眠いけど話したい」の合図。画面がうとうとした演出',                   false, 'emotion'),
  ('energy_drink',  '🧃', '栄養ドリンク', '「テンション上げてこ」。画面がキリッとする',                           false, 'emotion'),
  ('houji_cha',     '🫖', 'ほうじ茶',     '「今日おだやかモード」。会話がゆっくり落ち着く気配',                   false, 'emotion'),
  ('hot_milk',      '🥛', 'ホットミルク', '「もう寝る前だけど」の深夜感',                                         false, 'emotion'),
  ('beer',          '🍺', 'ビール',       '「今日おつかれ」の乾杯。相手にも送れる',                               false, 'emotion');

insert into public.drink_bar_items (key, emoji, name, description, is_free, category, season) values
  ('kakigori',      '🍧', 'かき氷',         '画面が一瞬キーンと青くなる',       false, 'seasonal', 'summer'),
  ('matcha_latte',  '🍵', '抹茶ラテ',       'うっすら桜色のシュワ',             false, 'seasonal', 'spring'),
  ('hot_chocolate', '🍫', 'ホットチョコ',   '画面がじんわり温まる演出',         false, 'seasonal', 'winter'),
  ('witch_soup',    '🎃', '魔女のスープ',   '紫の泡がぶくぶく',                 false, 'seasonal', 'halloween');
