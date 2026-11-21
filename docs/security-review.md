# WAY セキュリティ監査記録

更新: 2026-11-22。PR #1 / `security/api-authorization-review`。
初回監査基点 `4b9439ec6e5a7ad68bda709c6210d4862fa3e9ca`、追加修正基点 `e2b9febf12bf5dd788c8a5356e631c07fe6a8887`。
対象はリポジトリのAPI・呼び出し元・スキーマ・SQL権限・依存関係。実Supabaseの設定や秘密値は取得・変更していない。本番デプロイ・mainへのマージはしていない。

## 解消した主な問題

| リスク | 修正 |
| --- | --- |
| 未認証moderateから任意メッセージを管理更新 | getUserで検証した本人認証、投稿者とチャット参加確認。本文はDBから取得 |
| ブラウザーが審査を省略できる | messages INSERTと同じトランザクションで必須キューへ登録。サーバー定期処理が取得。通常の画面から審査API呼び出しを削除 |
| 審査前・失敗本文の相手への露出 | restrictive SELECT policyで相手にはpassedかつ非削除だけを公開。送信者には状態を表示。Realtimeも再取得し、ポーリングで取りこぼしを回復 |
| 同一投稿への並行AI呼び出し | 行ロック・SKIP LOCKEDで一度だけclaim。トークン付きleaseと状態照合で古い結果を拒否 |
| AI失敗を安全と扱う | 確定した失敗は30秒・60秒後に再試行、最大3試行でheld。通信切断・タイムアウトや期限切れleaseは即held。SAFE/FLAGGED以外を承認しない |
| 未審査投稿で会話回数/図鑑を増やせる | 承認遷移時だけ一度カウント。チャット行ロックで直列化。過去分の再審査による二重カウントも防止 |
| Pushの連打・重複 | 送信前に宛先＋イベントの一意レコードを予約。失敗・結果不明でも自動再送しない。分/時間の共有DB上限を追加 |
| 任意Push宛先・URL・文面、購読所有者上書き | サーバーで文面・相手・URLを決定。購読は本人RLSで登録。配信ホスト許可リスト、DBで登録上限と形式検証 |
| 課金/BAN/Stripe IDの自己変更 | 009で書込列を制限。Stripe側顧客metadataとの所有者照合、Webhookで顧客ID照合 |
| プロフィールの非公開情報を他人が読める | 012で既存の列SELECT権限も撤回。認証済み公開情報はid/codename/avatar_urlのみ。本人情報は引数のないget_my_profile RPCでauth.uid()に限定 |
| SECURITY DEFINER内部関数の一般公開 | 内部関数は一般実行権を撤回。追加関数は固定search_path、キュー操作・配信予約はservice_roleのみ |
| voiceの期限/状態/チャットID偽装、期限切れ/BANユーザーとのマッチ | 書込列を制限。キャンセルは本人のwaiting→expiredのみ。RPCで期限・双方のBAN・同一ペアの並行作成を検証 |
| 図鑑・メロンソーダ数の偽装 | 図鑑の直接書込とカウンターRPCを撤回。カウンターは参加権限が確認されたドリンクINSERTトリガーで更新 |
| 無関係なチャットへの投稿・リアクション・通報など | 参加者、期限、有効商品、購読状態、承認済みメッセージ、通報対象の整合性、ストック/ブックマークの出会いを検証 |
| BANがユーザー投稿を止めない | voices/messages/reactions/drinks/stocks/bookmarks/reports/zukan/push subscriptionsにrestrictive active-account policy |
| 既知の依存脆弱性 | Next.js 16.4.6等へ更新。初回修正時のnpm auditは0件 |

## 審査の状態と保証範囲

`queued → processing → done`。SAFEだけが相手に見える。FLAGGEDは削除フラグを付ける。
確定した失敗は`retry → processing`、3試行で`held`。曖昧な通信結果と2分のlease期限超過は`held`にする。保留解除は管理者用RPCだけに許可し、ブラウザーからはできない。

`/api/moderate`は旧クライアント向けの任意の高速化経路として残すが、定期ワーカーと同じDB claimを使う。必須処理はこれに依存しない。ワーカー・API・DBの障害時も相手には未承認本文を表示しない。

外部AIの実行を分散システム全体で「厳密に一度だけ」と保証するものではない。通信断後にプロバイダーが処理を続けている可能性があるため、自動再取得しない設計にした。管理者がその状態を確認せず手動再試行すれば、外部での再実行は起こり得る。失敗したネットワーク要求をAPI側で自動リトライしない（SDK maxRetries=0、timeout=15秒）。

通知も同様に「一意イベントにつき一度の送信試行」を選ぶ。配信後のDB記録失敗やプロセス停止でも予約を消さないため、重複を避ける代わりに未達の可能性がある。端末や配信事業者内部の再配信まで保証しない。

## 頻度制限（固定時間窓）

| 対象 | 制限 |
| --- | --- |
| 新規メッセージ | ユーザーごと10件/分、100件/時 |
| AI claim（再試行を含む） | 全体60件/分、1メッセージ最大3試行 |
| Push予約 | 全体120イベント/分、宛先ごと10/分、操作ユーザーごと10/分・100/時 |
| 保存Push購読 | 1ユーザー最大3件、登録/更新5回/分 |
| voice | 3件/分、30件/時 |
| マッチング | 操作ユーザーごと5回/分 |
| ドリンク | 10件/分 |

DBトランザクション内で共有カウンターを更新するため、複数のアプリプロセスやData APIからも制限が働く。境界をまたぐバーストは最大2窓分起こり得る。件数はプロトタイプ向け初期値であり、運用の計測に基づく調整が必要。

## 回帰テストと限界

- 既存34件を維持し、APIの審査更新テストはトークン付きRPCへ更新。
- API単体テストは実ルート/共通処理を変換し、SDKを置換。外部APIは呼ばない。
- 初回009までのDBテストに加え、schema→001・003〜012をPGliteのPostgreSQLで適用し、authenticated/anon/service_roleを切り替えて拒否と正常系を検証。
- 新規DBテストは、隠された本文、claim重複、古いtoken、再試行・保留、履歴再審査、承認時カウント、頻度制限、プロフィール、BAN、voice、通報、ドリンク、購読をカバー。
- 同時Push呼び出しで配信処理が1回だけになるテストも追加。DBテストは単一PGliteインスタンスであり、実PostgreSQLの複数接続負荷試験を代替しない。
- Supabase Authはテスト用auth.uid()を使用。uuid-ossp、Realtime publication（002）、pg_cron/pg_net/Vaultと実HTTPの連携はこのテストでは実行していない。
- 実環境のPostgREST・Realtimeの権限挙動、複数端末の画面、実AI/Push/Stripe疎通はステージングで別途必須。

最終結果は61件成功（既存34件を含む）、型チェック成功、`npm run build -- --webpack`成功（22ページ生成）。通常のTurbopackビルドは実行環境のポート作成制限により失敗。ビルドはダミー環境変数を使用し、本番DB・外部AI・決済APIには接続していない。

## 本番前の条件と残課題

[適用・監視手順](security-rollout.md)に沿って検証環境で確認する。010は過去の非削除passedも再審査へ戻すため、相手から一時的に見えなくなり、バックログとAI費用が発生する。履歴のサイズを確認せず適用しない。

残る項目は、実環境のRLS/grant差分・Storage/avatar権限・Auth設定の照合、スケジューラー接続と監視、実サービス連携、既存の課金/集計値の照合。新しい制限は過去の改ざん済みデータを自動修復しない。StripeのWebhook順序/重複・checkout冪等性、退会時の外部キー処理、通知設定/ミュートの完全反映、データ保持と削除も引き続き確認が必要。

必須AI審査の対象はmessagesであり、公開タイムラインのvoicesやプロフィール等まで含む全コンテンツ審査ではない。AI判定自体の誤判定・プロンプトインジェクションへの評価、人による異議申立て対応も別途必要。大量アカウント作成に対するAuth側の制限や、総費用上限・滞留件数監視を運用で設定する。

## 参考

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase 列権限](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [Supabase 定期HTTP処理とVault](https://supabase.com/docs/guides/functions/schedule-functions)
- Next.js同梱Route Handlersドキュメント（node_modules/next/dist/docs）。
