# WC Tournament Tracker

FIFAワールドカップ2026 決勝トーナメント（Match 73〜104）の進行を表示・更新するWebアプリです。

## 技術スタック

- Next.js (App Router)
- Mantine
- Turso SQL (`@libsql/client`)
- 生SQL（Drizzleなし）

## セットアップ

1. 依存関係をインストール

```bash
npm install
```

2. 環境変数を設定（`.env.example` を参考）

```bash
cp .env.example .env.local
```

3. マイグレーションとseed

```bash
npm run db:migrate
npm run db:seed
```

4. 開発サーバー起動

```bash
npm run dev
```

## 画面

- `/` 決勝トーナメント表（横スクロール）
- `/matches/[id]` 試合詳細
- `/admin/login` 管理ログイン
- `/admin` 試合一覧・結果更新
- `/admin/matches/[id]` 試合編集

## 管理認証

`ADMIN_PASSWORD` 環境変数で簡易認証します。MVP向けの最小構成です。
