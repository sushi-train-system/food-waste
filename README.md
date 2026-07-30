# 寿司 廃棄トラッカー (Sushi Waste Tracker)

寿司屋の**廃棄数**を2時間ごとに記録し、**曜日別・月次・年次**で分析するためのスマホ向け Web アプリです。

## 特徴

- **スマホ最適化 UI** … 下部タブ + 大きめのステッパーで、営業中でも片手で入力可能。
- **入力タブ** … 日付と2時間ごとの時間帯を選び、メニューごとの廃棄数を入力。メニューは「にぎり / 軍艦 / 巻物・ロール / サイド / デザート」のジャンルでサブタブ分け。
- **分析タブ** … 合計廃棄数、最も廃棄が多い曜日、**曜日別（1日平均 / 合計）・月次・年次**のグラフ、ジャンル別の内訳。
- **データタブ** … 「2時間ごとの生データ」と「日次集計データ（分析に使う綺麗なデータ）」をテーブル表示し、**CSV 出力**が可能。

## 技術スタック

- [Next.js 16](https://nextjs.org/) (App Router) / React 19 / TypeScript
- Tailwind CSS v4
- Prisma 6 + Supabase Postgres
- Recharts（グラフ）
- Netlify（試験運用のホスティング想定）

## セットアップ

Supabase でプロジェクトを作成し、`.env.example` を参考に `.env` を用意します。

必要な環境変数:

- `DATABASE_URL`: アプリ実行用の Supabase Postgres URL
- `DIRECT_URL`: Prisma migrate 用の Supabase Direct connection URL
- `DEFAULT_STORE_SLUG`: 試験運用で使う店舗 slug（初期値: `main`）
- `DEFAULT_STORE_NAME`: 試験運用で使う店舗名
- `DEFAULT_STORE_TIMEZONE`: 店舗のタイムゾーン（初期値: `Australia/Brisbane`）

```bash
# 依存関係のインストール（postinstall で prisma generate が走ります）
npm install

# DB を作成し、初期メニューを投入
npm run db:setup

# 開発サーバー起動
npm run dev
```

ブラウザ（スマホ推奨）で http://localhost:3000 を開きます。

## Netlify デプロイ

Netlify の Site settings で環境変数を設定します。

- `DATABASE_URL`
- `DIRECT_URL`
- `DEFAULT_STORE_SLUG`
- `DEFAULT_STORE_NAME`
- `DEFAULT_STORE_TIMEZONE`

ビルド設定は `netlify.toml` に定義しています。

```bash
npm run build
```

初回デプロイ前、または Supabase の schema を更新した後はローカルから以下を実行します。

```bash
npm run db:setup
```

## データモデル

| モデル | 内容 |
| --- | --- |
| `Store` | 店舗。試験運用では `DEFAULT_STORE_SLUG` の1店舗を利用。 |
| `Category` | 店舗ごとのメニューのジャンル（にぎり / 軍艦 など）。入力タブのサブタブに対応。 |
| `MenuItem` | 店舗ごとの個々のメニュー（マグロ、サーモン など）。 |
| `WasteEntry` | 2時間ごとの廃棄数の生データ。`store` × `date`(YYYY-MM-DD) × `slot`(時間帯の開始時刻) × `menuItem` で一意。 |

時間帯（2時間スロット）と営業時間は `lib/config.ts` の `TIME_SLOTS` で変更できます（初期値: 10,12,14,16,18,20 = 10:00〜22:00）。

## API

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/api/menu` | ジャンルとメニュー一覧 |
| GET | `/api/entries?date=&slot=` | 指定日・時間帯の入力値 |
| POST | `/api/entries` | 入力値の一括保存（0 は削除） |
| GET | `/api/analytics?start=&end=&category=` | 月次 / 年次 / 曜日別 / ジャンル別の集計 |
| GET | `/api/data?view=raw\|daily&start=&end=` | 生データ / 日次集計データ |
| GET/POST | `/api/categories` | 設定タブ用のジャンル取得 / 作成 |
| PATCH/DELETE | `/api/categories/[id]` | 設定タブ用のジャンル更新 / 削除 |
| POST | `/api/items` | 設定タブ用のメニュー作成 |
| PATCH/DELETE | `/api/items/[id]` | 設定タブ用のメニュー更新 / 削除 |

## メニューのカスタマイズ

初期メニューは `prisma/seed.ts` に定義しています。店舗のメニューに合わせて編集し、`npx prisma db seed` を再実行してください。
