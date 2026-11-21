# セキュリティ監査とレビュー手順

監査日: 2026-11-22。基点: `4b9439ec6e5a7ad68bda709c6210d4862fa3e9ca`。
対象: 全8 APIルート、呼び出し元、Supabase schema / 番号付きmigration、service-role利用、依存関係。実環境の設定やログ・秘密値は取得していない。

## 主な指摘と修正

| 重要度 | 問題 | この変更 |
| --- | --- | --- |
| 重大 | moderateが未認証で任意IDと任意本文を受け取り、管理権限で審査状態・削除フラグを変更 | 検証済みBearer認証、RLS下での取得、投稿者と参加者の両方を確認。本文はDBから読み、更新対象・本文・pending状態を再照合。管理権限は最終更新のみ |
| 重大 | profilesの行所有チェックだけでは課金・BAN・Stripe IDの自己変更を防げない | 009でINSERT/UPDATE列を許可リスト化。Stripe ID・BAN理由の一般SELECTも撤回。過去に改ざんされたStripe IDを信用せず、Stripe側の所有者metadataをcheckout/portalで照合 |
| 高 | 内部SECURITY DEFINER関数にPUBLIC EXECUTEが残る | 図鑑更新・タイマー検索/更新・トリガー関数の一般実行を撤回。タイマーはservice_roleのみ |
| 高 | reactions / drink_bar_usesに参加権限チェックがない | 009で参加者を検証。ドリンクは期限・有効商品・課金状態も検証 |
| 高 | メッセージINSERTで審査状態を指定でき、期限切れへの投稿も可能 | 列権限とRLSで制限。自由チャットは期限に依存せず投稿可能 |
| 高 | Pushの任意通知内容・任意URL、target IDのフィルター文字列への埋め込み | chat IDとイベントのみ受付。RLS＋参加者確認後、相手・文面・URLをサーバーで決定。相思相愛は双方向ストックを確認 |
| 高 | Push購読の管理権限upsertで他人のendpoint所有者を変更可能。任意宛先へのサーバー通信 | ユーザー権限のRLSで保存。登録時と送信時の双方で既知のPush配信ホストだけを許可。保存エラーを成功扱いしない |
| 高 | 既知の依存脆弱性 | Next.js 16.4.6と修正版の間接依存に更新。lockfile更新後のnpm auditは0件 |
| 中 | ブラウザーのlocalStorage認証とAPIのCookie認証が不一致 | 全ユーザー向けAPIと呼び出し元をBearer方式へ統一。サーバーはgetUserで検証 |
| 中 | AI/DB失敗を「安全」と返す、例外に機密データが含まれる可能性 | 失敗は502/503等の明示的エラー。生のSDK例外をログ出力しない。WebhookのDBエラーも再送可能な500にする |

APIの返却値やUIの非表示だけではデータ保護にならない。SQLの009も適用して初めて列権限・DB関数の修正が有効になる。

## APIごとの確認範囲

- `/api/moderate`: 自分が投稿した参加チャット内のpendingメッセージのみ。削除済み・処理済みは409。更新競合も409。AI出力はSAFE/FLAGGEDだけを受理。
- `/api/profile/delete`: 検証した本人IDだけをAuth管理APIへ渡す。チャット等の外部キーで退会処理が失敗する可能性は別途実環境で確認が必要。
- `/api/push/send`: 有効な参加チャットとイベントを確認。chat_startedは参加を開始した側（user2）のみ。
- `/api/push/subscribe`: 本人のRLSで保存。配信ホスト許可リスト外のブラウザー/サービスは拒否するため、対応範囲追加時に検証が必要。
- `/api/push/timer-check`: 設定済みCRON_SECRETの一致が必要。設定欠落は拒否。
- `/api/stripe/checkout`, `/portal`: 本人認証とStripe顧客所有者の照合。古い顧客にmetadataがなければ409となるため、運用者による照合が必要。
- `/api/stripe/webhook`: 署名を検証し、顧客IDとユーザーIDの両方で更新対象を絞る。DBエラーは500。

## 検証

`npm test`: 34件成功。APIテストは実ルートをTypeScriptから変換してSDKを置換し、不正要求でAIや管理更新に到達しないことを検証する。外部サービスの実通信テストではない。

DBテストはPGliteのPostgreSQLでschema、001・003〜009を実行し、authenticated/anonロールへ切り替えて権限拒否と正常系を確認する。Supabase Authはauth.uid()のテスト用実装を使う。uuid-ossp拡張とRealtime publication（002）はこのテストでは実行しない。Supabase本体、Storage、Realtimeの統合検証を代替するものではない。

`npm run typecheck`: 成功。`npm run build -- --webpack`: ダミー環境変数で成功（21ページ生成）。通常のTurbopackビルドは、この実行環境のポート作成制限で失敗。初回はGoogle Fontsの取得制限でも失敗した。標準ビルドの実環境での再確認は必要。

008はschemaに既にある同名ポリシーで失敗するため、再作成前にdrop if existsを追加した。既存DBへ過去migrationを再実行する指示ではない。

## 残る課題・公開運用前の条件

1. **必須審査と頻度制限**: 現状の審査はブラウザーの任意呼び出しで省略でき、pending本文も参加者に読める。同一pendingメッセージの並行要求は複数回AI課金を発生させ得る。サーバーキューで一意にclaimし、審査済みのみ配信する設計が必要。失敗時の再試行・保留表示も必要。今回の修正を「全投稿の安全審査保証」と説明しない。
2. **通知の重複と濫用**: 有効な相手への同一イベント連打は未制限。ユーザー/イベント別のDB一意キー、送信頻度制限、通知設定・ミュート反映を追加する。timerの一括処理にもclaimと失敗再試行が必要。
3. **その他DB仕様**: voicesの変更可能列、match_voiceの期限・BAN検証、reportsの対象整合性、図鑑の自己更新、メロンソーダRPCの連打を改善する。マッチングRPCに期限/BAN検証を加え、カウンターはドリンクINSERTトリガーに移し、クライアント直接更新を禁止する案を推奨。現在の公開プロフィール列には通知設定や購読状態が含まれるため、公開プロフィールと本人専用情報の分離も必要。
4. **Stripe整合性**: checkout並行作成の冪等性、Webhook順序逆転・重複、存在しないユーザー/顧客による0行更新の扱いを追加検証する。既存の不正な課金フラグがあれば、Stripeを正として照合する。自動一括修復は行っていない。
5. **運用設定**: 実Supabaseのpolicy・列grant・RPC grantがコードと一致するか、Storageのavatars所有者制限、Auth/メール設定、ログの保管範囲を確認する。Git履歴全体を対象とした専門的な秘密情報検査は今回の範囲外。
6. **仕様と実装差**: 期限切れのデータ削除、アカウントBAN、人間による異議申し立て対応等は別途実装・運用検証が必要。

## 安全な導入順序

1. まずこのPRのAPI変更、009の列grant/関数grant、READMEの説明をレビューする。自動デプロイやDB変更はこの作業から実行しない。
2. 独立した検証環境で実環境と同じスキーマ・権限を再現し、009を適用。未知の既存ポリシー・列単位grantがあれば別途確認する。今回のテストはリポジトリ上の設定が前提。
3. 未認証、本人、相手、第三者の4通りでAPIと直接Data APIを確認。課金列のINSERT/UPDATE拒否、内部RPC拒否、審査エラー、期限切れ/freeチャット、既存ログインからのBearer送信を確認する。
4. Stripeテストモード、複数ブラウザーPush、実AIとの疎通を確認。秘密値・メッセージ本文をテストログに出さない。
5. APIとクライアントを同時に切り替える。旧クライアントのCookieのみのAPI要求は401となるため、再読み込み案内が必要。審査更新の一部だけを戻して未認証管理APIを再公開しない。

本番変更は別途、レビューと検証結果を確認したうえで判断する。

## 参考資料

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser)
- Next.jsの同梱Route Handlersドキュメント（`node_modules/next/dist/docs/`）。
