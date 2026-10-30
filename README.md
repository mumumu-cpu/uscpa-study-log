# USCPA Study Log

USCPAの勉強時間（Input / Output）とタスクを記録し、Workers AI が翌週の学習を3行でフィードバックするモバイルファーストのWebアプリ。

- **Stack**: Next.js 15 (App Router, Edge runtime) · `@cloudflare/next-on-pages` · Cloudflare D1 · Workers AI · Auth.js (Google) · Tailwind CSS v4 · Framer Motion · Chart.js · Playwright
- **UI**: 白ベースのリキッドグラス（`backdrop-blur-md bg-white/60 border border-white/40 shadow-xl`）、パステルの流体グラデーション背景、全画面Shimmerスケルトン

## 機能

| 画面 | 内容 |
| --- | --- |
| Timer | 最上部の巨大タイマー（タップで開始/停止、鼓動アニメーション）、Input/Output トグル、週間積み上げ棒グラフ（17–20h/週の目標帯）、週合計と Output 比率（目標50%） |
| Tasks | Abitus MCQ / TBS / 講義 / その他。カードを右フリックで 未着手→進行中→完了、左フリックで戻る |
| AI | `@cf/meta/llama-3.3-70b-instruct-fp8-fast`（失敗時 `llama-3.1-8b-instruct-fp8` → ルールベース）で「結論ベース・3行以内」のアドバイス |

タイマーは停止時・モード切替時に区間を確定して D1 にモード別で保存します。タブを閉じた場合も `sendBeacon` で送信し、計測は継続します。

> `@cf/meta/llama-3-8b-instruct` は Workers AI で提供終了しているため、後継の Llama モデルを使用しています。

## ローカル開発

```bash
npm install
cp .dev.vars.example .dev.vars   # Google OAuth の値を設定
npm run db:migrate:local
npm run dev
```

Google ログインなしで動作確認する場合（本番ビルドでは無効）:

```bash
AUTH_BYPASS=1 AUTH_SECRET=dev npm run dev
```

## テスト

```bash
npx playwright install chromium
npm run test:e2e
```

E2E は Pixel 7 エミュレーションで以下を検証します: 起動時の全画面スケルトン → タイマー即時開始/停止と D1 保存、Input/Output 切替とモード別保存、週間グラフ表示、タスクのスワイプによる 未着手⇄進行中⇄完了 と再読込後の永続化。

## デプロイ (Cloudflare Pages)

```bash
npx wrangler d1 create uscpa-study          # database_id を wrangler.toml に設定
npm run db:migrate:remote
npx wrangler pages project create uscpa-study-log --production-branch main
npx wrangler pages secret put AUTH_SECRET --project-name uscpa-study-log
npx wrangler pages secret put AUTH_GOOGLE_ID --project-name uscpa-study-log
npx wrangler pages secret put AUTH_GOOGLE_SECRET --project-name uscpa-study-log
npm run pages:deploy
```

Google Cloud Console の OAuth クライアントに承認済みリダイレクト URI
`https://<your-domain>/api/auth/callback/google` を追加してください。

## スキーマ

`migrations/0001_init.sql` — `study_sessions`（user_id, date, input_seconds, output_seconds）、`tasks`（id, user_id, title, category, status）、`feedback`（user_id, week_start, content）。
