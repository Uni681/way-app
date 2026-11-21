# WAY

> 属性を脱ぎ捨て、脊髄で会話する24時間。

WAYは、コードネームで短い「声」を投げ、気になった声に乗ることで1対1の会話が始まるチャットアプリの開発中プロトタイプです。深夜のファミレスで偶然隣り合うような、肩書きより会話の波長を大切にする体験を目指しています。

## 実装されている機能

- Supabase Authによる登録・ログイン、プロフィールとルール同意。
- 声のタイムライン、マッチング、Realtimeで更新されるチャットとリアクション。
- 会話を彩るドリンクバー、相手を残すストック・ブックマーク、会話から集まる「人間図鑑」。
- 原則24時間のチャットと、出会い回数による自由チャットへの移行。
- キーワード検査とClaude APIによるメッセージ審査。
- Web Push通知、Stripeのサブスクリプション・管理画面への接続。

これはコードに存在する機能の一覧であり、本番での動作保証ではありません。[仕様書](way_spec_v2.md)には将来構想も含まれます。例えばAI審査は現在、メッセージの削除フラグを更新するもので、仕様書にあるアカウント自動BAN全体の実装ではありません。24時間経過後の物理削除も保証していません。

## 技術構成

| 領域 | 使用技術 |
| --- | --- |
| 画面・API | Next.js 16.4.6 / App Router、React 19、TypeScript |
| スタイル | Tailwind CSS 4 |
| 認証・データ | Supabase Auth / PostgreSQL / RLS / Realtime / Storage |
| 審査 | Anthropic SDK、Claude Haiku（モデルIDはAPI実装を参照） |
| 決済・通知 | Stripe、Web Push |
| 検証 | Node.js test runner、PGliteによるローカルPostgreSQL権限テスト |

`app/`に画面とAPI、`lib/`に共通処理、`supabase/`にスキーマとSQL変更、`tests/`に回帰テストがあります。

## ローカルでの確認

Node.js 24とnpmを使用して確認しています。

```sh
npm ci
npm test
npm run typecheck
npm run dev
```

アプリを動かすには、専用の開発用Supabaseプロジェクトと環境変数が必要です。`.env.local`はGit管理外です。値をREADMEやPRに貼り付けないでください。

| 環境変数名 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開クライアント設定。データ保護はRLSで行う |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー専用の限定された管理処理 |
| `ANTHROPIC_API_KEY` | サーバー専用のAI審査 |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | 決済。開発時はテストモードを使う |
| `NEXT_PUBLIC_APP_URL` | 決済からの戻り先 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL` | Web Pushの公開鍵・秘密鍵・連絡先 |
| `CRON_SECRET` | タイマー通知のサーバー間認証 |

新規DBは`supabase/schema.sql`の後に番号付きSQL `001`〜`009`を順に適用する構成です。`seed_test_data.sql`は任意のテストデータであり、本番適用対象ではありません。CLIの一括resetを本番へ実行しないでください。Storageのavatarsバケット・ポリシー、Auth設定、通知スケジュール等は別途必要です。現状は完全自動で環境を再構築できる構成ではありません。

## 動作確認状況（2026年11月22日）

- 自動テスト34件通過。未認証・他人のメッセージ・参加権限・不正入力・審査失敗・課金情報の改ざん・DB関数の権限などを検証。
- TypeScript型チェック通過。
- `npm run build -- --webpack`成功。標準のTurbopackビルドは実行環境のポート作成制限で未完了。詳細は[監査記録](docs/security-review.md)を参照。
- 依存パッケージを修正後、`npm audit`の既知の脆弱性検出は0件（検査時点）。
- 作者による動作確認は行っていますが、端末・ケース別の過去の記録は未整理です。
- 本番Supabaseの実設定照合、実アカウントを使った画面操作、実機Push、Stripeテスト決済、外部AI疎通は今回未実施です。本番デプロイ・DB変更は行っていません。

## 制作の担当分担

作者は企画・仕様・デザイン判断・動作確認を担当し、コード実装は主にAIを利用しています。今回のセキュリティ監査、修正コード、回帰テスト、README草案もAIの支援で作成しています。AIが生成した変更はPRでレビューし、実環境での検証を経て採否を判断する方針です。

応募時には、全コードを独力で実装した成果としてではなく、体験の設計、仕様判断、AIとの協働、検証と改善の過程が分かる制作物として説明します。

## セキュリティ上の現在地

APIの認証・認可とSQL権限を改善していますが、安全性の認証を受けた製品ではありません。ブラウザーから審査APIを呼ぶ方式では審査の省略が可能であり、公開運用前にはサーバー側の必須審査キュー、頻度制限、実環境のRLS確認が必要です。残課題と導入順序は[監査記録](docs/security-review.md)にまとめています。
