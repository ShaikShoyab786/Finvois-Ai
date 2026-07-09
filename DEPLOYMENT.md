# Deploying Finvois to Render (with your own API key)

Follow these steps in order. You only need a web browser — no coding.

## Step 1 — Get your own Anthropic API key

The AI features (reading DPR PDFs, writing summaries) run on Anthropic Claude.

1. Go to https://console.anthropic.com and sign up (or log in).
2. Add billing under **Settings → Billing** (the app makes a few large AI
   calls per uploaded report, so a small credit balance is needed).
3. Go to **API Keys → Create Key**, name it `finvois`, and copy the key
   (it starts with `sk-ant-`). Keep it somewhere safe — you'll paste it into
   Render in Step 3.

> The app automatically uses your key when `ANTHROPIC_API_KEY` is set.
> Inside Replit, if the key is not set, it keeps using Replit's built-in AI
> connection, so nothing breaks in development.

## Step 2 — Push the code to GitHub

1. In the Replit workspace, open the **Git** pane (left toolbar → Tools → Git).
2. Click **Connect to GitHub**, authorize Replit, and create a new repository
   (e.g. `finvois`). Private is fine — Render can read private repos.
3. Click **Commit & push** (Replit stages all files for you). Your code is now
   on GitHub.

Whenever you make changes later, come back to the Git pane and
**Commit & push** again — Render will redeploy automatically.

## Step 3 — Deploy on Render

This repo contains a `render.yaml` "blueprint" that tells Render exactly what
to create: one web service (the app) and one PostgreSQL database.

1. Go to https://render.com and sign up (or log in) — easiest with your
   GitHub account.
2. Click **New → Blueprint**.
3. Select your `finvois` GitHub repository and click **Connect**.
4. Render reads `render.yaml` and shows what it will create:
   - **finvois** — the web app
   - **finvois-db** — the database
5. It will ask for one value: **ANTHROPIC_API_KEY** — paste the key from
   Step 1. (`SESSION_SECRET` and `DATABASE_URL` are filled in automatically.)
6. Click **Apply / Deploy Blueprint** and wait ~5-10 minutes for the first
   build. The database tables are created automatically before the app starts
   (the `preDeployCommand` runs the schema push).

When the deploy turns green, open the URL Render shows
(something like `https://finvois.onrender.com`).

## Step 4 — Verify it works

1. Open your Render URL — you should see the Finvois landing page.
2. Upload a DPR PDF, pick a branding theme, and wait for processing.
3. Check the dashboard loads with the financial sections and the AI
   executive summary, and try **Export → Download PDF**.

If processing fails, check **Render → finvois → Logs**. The most common cause
is a missing/invalid `ANTHROPIC_API_KEY` (fix it under
**finvois → Environment**, then **Manual Deploy → Deploy latest commit**).

## Costs (as of writing)

- **Render web service**: `starter` plan (paid, small monthly fee). You can
  change to `free` in `render.yaml`, but free services sleep after idle and
  are slow to wake.
- **Render database**: `basic-256mb` plan (small monthly fee). Render's free
  Postgres expires after 30 days, so a paid plan is recommended for real use.
- **Anthropic**: pay-per-use; each uploaded report costs roughly a few rupees'
  worth of API credit.

## Environment variables reference

See `.env.example` for the full list. In short:

| Variable | Where it comes from |
| --- | --- |
| `ANTHROPIC_API_KEY` | You paste it (Step 3) |
| `DATABASE_URL` | Wired automatically from the Render database |
| `SESSION_SECRET` | Generated automatically by Render |
| `PORT` | Set automatically by Render |

## Running locally (optional, for developers)

```bash
npm install -g pnpm@10.26.1
pnpm install
cp .env.example .env   # fill in DATABASE_URL and ANTHROPIC_API_KEY
pnpm run db:push       # create the database tables
pnpm run build:prod    # build frontend + server
PORT=5000 pnpm run start:prod
```

Then open http://localhost:5000.
