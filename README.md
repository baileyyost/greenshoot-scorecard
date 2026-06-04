# GreenShoot Opportunity Scorecard

A password-protected internal web app. Enter a platform/ISV (and optionally a company,
operator, and pasted context or an uploaded file); it scores the opportunity against the
GreenShoot rubric — five metrics, −3 to +3 each — and returns a total, decision band,
per-metric rationale, and key risks.

The scoring runs through Claude. A small server piece holds your Anthropic API key and a
shared password, so the key is never exposed to the browser and nobody can use the tool
(or your key) without the password.

---

## What you need (one-time)

1. **An Anthropic API key** — go to https://console.anthropic.com → API Keys → create one,
   then add a little credit under Billing. Each scoring run costs a fraction of a cent.
2. **A Vercel account** — https://vercel.com (free Hobby tier is fine). Sign in with GitHub.
3. **Node.js 18+** installed locally, only if you want to run it on your own machine first.

---

## Two environment variables

The whole thing is controlled by two secrets you set in Vercel (and in a local `.env` if
running locally):

| Variable            | What it is                                              |
|---------------------|---------------------------------------------------------|
| `ANTHROPIC_API_KEY` | Your Anthropic key. Stays on the server.                |
| `SITE_PASSWORD`     | The shared password people type to open the tool.       |

To change the password later, just edit `SITE_PASSWORD` in Vercel and redeploy. No code change.

---

## Deploy to Vercel (the live URL)

### Option A — drag-and-drop / GitHub (no terminal)

1. Put this folder in a GitHub repo (or zip it and import it at vercel.com → Add New → Project).
2. When Vercel asks, accept the detected framework (**Vite**). Build command `vite build`,
   output `dist` — these auto-fill.
3. Before the first deploy, open **Environment Variables** and add:
   - `ANTHROPIC_API_KEY` = your key
   - `SITE_PASSWORD` = the password you want to hand out
4. Click **Deploy**. You get a URL like `greenshoot-scorecard.vercel.app`.
5. Open it, enter the password, and score something.

### Option B — Vercel CLI (terminal)

```bash
npm i -g vercel
cd greenshoot-scorecard
vercel            # follow prompts to link/create the project
vercel env add ANTHROPIC_API_KEY     # paste your key when asked
vercel env add SITE_PASSWORD         # type your chosen password
vercel --prod     # deploys to the live URL
```

The `api/` folder is picked up automatically as serverless functions — no extra config.

---

## Run locally first (optional)

```bash
cd greenshoot-scorecard
npm install
cp .env.example .env        # then edit .env with your real key + password
npm run dev                 # opens the frontend on http://localhost:5173
```

Note: `npm run dev` serves the frontend only — the `/api` endpoints (password check and
scoring) don't run under plain Vite. To test those locally, run `vercel dev` instead of
`npm run dev` (it serves both the app and the functions together).

---

## How the password works

- The password lives **only** on the server as `SITE_PASSWORD`. It is never in the
  downloaded code or the browser bundle.
- On the unlock screen, the password is checked against the server (`/api/auth`).
- Every scoring request also re-checks it server-side (`/api/score`); a request without the
  correct password is rejected before it ever reaches Claude.
- A correct password is remembered for that browser tab session (cleared when the tab closes
  or you click **Lock**). It is not stored permanently.

This is a single shared password, not individual logins — fine for a small internal group.
If you ever need per-person accounts, expiry, or audit logs, that's a bigger auth layer.

---

## Notes

- The app is marked `noindex`, so it won't show up in search engines.
- Cost scales with use: each scoring run is one Claude call. Watch usage in the Anthropic console.
- To change the rubric, anchors, or decision bands, edit `RUBRIC`, `SYSTEM_PROMPT`, and
  `band()` near the top of `src/App.jsx`.
