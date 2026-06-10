# タスク台帳（永続・セッション横断）

> **運用**（[[numbered-choices]] 準拠）
> - 番号 **#N は固定**。振り直さない。完了は ~~取り消し線~~ ＋完了日・コミットSHA を残す（完了履歴も永続的に見る）。
> - セッション内の TaskList はセッション終了/フォークで消えるため、**正本はこのファイル**。セッション開始時にここを読む。
> - W系（WBS）・AT系（認証）は [launch-task-board.md](launch-task-board.md) 参照。本台帳は日次の #N 系列。

最終更新: 2026-06-10

## 完了

- ~~#13 Clerk(Google)認証 — ログイン必須化＋ヘッダUserButton~~（6/9頃・`3fe133f`）
- ~~#23 管理画面を所有者(Clerkオーナーメール)限定に・旧パスワード方式廃止~~（6/10・`42c6178`）
- ~~#24 会場天気表示 — WeatherAPI・3hキャッシュ・全言語同一スナップショット~~（6/10・`5d867dc` + fix `5443a61`）
- ~~#20a 試合イベント表示・手動tier — admin入力CRUD＋時系列表示＋i18n×5~~（6/10・`2be097a`）

## 進行中

- **#20b** 試合イベント・自動tier — **コミット済み**（6/10・`dac6893`・ui-feature実装）。tsc/lint/test 全PASS（295件）。**残: AIレビュー2段ゲート（/ai-review・/security-review）を後追いで実施→push判断**
- **#21** 法務ページ清書 — (legal) terms/privacy/tokushoho を公開可能水準へ。**legal-seo-infra エージェントが清書中（6/10）**。価格(#14)/ドメイン(#22)はプレースホルダ・事業者情報は開示請求方式・弁護士レビュー前提
- **#20c** 手動tierの動作確認 — `/admin/matches/1` で追加 → `/matches/1` 表示・5言語ラベル確認。**ユーザー実施予定**

## 保留（判断・外部要因待ち）

- **#7** CI を GitHub へ push — `gh auth refresh -s workflow` がユーザー操作待ち（[[gh-workflow-scope-missing]]）。ワークフローはローカルに保留中
- **#8** セキュリティ仕上げ — Sentry 導入と CSP 方針の判断待ち
- **#12** 開幕前の通しQA（W9 と一体。2段ゲート→デプロイ）
- **#14** Stripe 課金接続 — 商品名・価格が未決（ユーザー判断待ち）。**課金動線は6/11確定**: グループステージ(〜6/27)無料→決勝T(6/28〜)課金壁・6/28以降の新規登録のみ72h無料・予告バナー（[[launch-monetization-plan]]）。entitlement は日付ゲート方式で実装する
- **#26** 課金壁の予告バナー — 無料期間中に「決勝トーナメントからは買い切り○円」を表示（6/25頃から強調）。#14 の価格確定後に実装
- **#19** i18n 棚卸し結果（6/11 実施）— 本文UIは5言語対応済みを確認。修正済み: 投票エラーの多言語化＋es/pt/zhイベントラベル（`23f2d41`）。**残（要設計判断）**: 各ページの metadata（title/description）と OGP 画像文言が全ページ日本語固定（既存設計。generateMetadata の locale 対応はクローラに cookie が無い問題と表裏なので、対応するなら hreflang/URL 戦略とセットで）
- **#22** ドメイン取得 — **ほぼ完了（6/11）**: matchfav.com を Cloudflare で取得済み・info@matchfav.com 受信稼働（Email Routing→Gmail・外部送信元で実証・キャッチオール有効・受信専用）。残: Vercel への DNS 接続（A/CNAME を「DNSのみ(グレー雲)」で追加）＝ #25 とセットで実施
- **#25** 本番 Clerk 設定 — 本番ドメイン取得（#22）に連動
- **#27** リブランド一括反映 — **実装完了・未コミット（6/11）**: ヘッダ/metadata/OGP/manifest/llms.txt/i18n5言語brandTitle/OGP画像/法務3ページを MatchFav・matchfav.com・info@matchfav.com で置換。SITE_URL_FALLBACK も matchfav.com に。tsc/test/lint グリーン。残プレースホルダは【価格未定】(#14)のみ

## 番号の欠番について

旧セッションの TaskList（#1〜#25）はセッション終了で消失し、ハンドオフ・memory・git に記録が残っていたもののみ復元した。**#1〜#6, #9〜#11, #15〜#18 の内容は未復元**（多くは完了済みか W系に吸収された可能性が高い）。元セッション「Handoff document creation」（アーカイブ済み）のトランスクリプト検索で復元可能。判明し次第ここに追記し、番号は再利用しない。
