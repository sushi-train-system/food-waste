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
- Prisma 6 + SQLite（ローカルファイル DB）
- Recharts（グラフ）

## セットアップ

```bash
# 依存関係のインストール（postinstall で prisma generate が走ります）
npm install

# DB を作成し、初期メニューを投入
npx prisma migrate deploy && npx prisma db seed
# ※ 開発中に一からやり直す場合は `npx prisma migrate reset`

# 開発サーバー起動
npm run dev
```

ブラウザ（スマホ推奨）で http://localhost:3000 を開きます。

環境変数は `.env`（`.env.example` 参照）で `DATABASE_URL` を指定します。デフォルトは `file:./dev.db`（プロジェクト直下の SQLite ファイル）です。

## データモデル

| モデル | 内容 |
| --- | --- |
| `Category` | メニューのジャンル（にぎり / 軍艦 など）。入力タブのサブタブに対応。 |
| `MenuItem` | 個々のメニュー（マグロ、サーモン など）。 |
| `WasteEntry` | 2時間ごとの廃棄数の生データ。`date`(YYYY-MM-DD) × `slot`(時間帯の開始時刻) × `menuItem` で一意。 |

時間帯（2時間スロット）と営業時間は `lib/config.ts` の `TIME_SLOTS` で変更できます（初期値: 10,12,14,16,18,20 = 10:00〜22:00）。

## API

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/api/menu` | ジャンルとメニュー一覧 |
| GET | `/api/entries?date=&slot=` | 指定日・時間帯の入力値 |
| POST | `/api/entries` | 入力値の一括保存（0 は削除） |
| GET | `/api/analytics?start=&end=&category=` | 月次 / 年次 / 曜日別 / ジャンル別の集計 |
| GET | `/api/data?view=raw\|daily&start=&end=` | 生データ / 日次集計データ |

## メニューのカスタマイズ

初期メニューは `prisma/seed.ts` に定義しています。店舗のメニューに合わせて編集し、`npx prisma db seed` を再実行してください。
