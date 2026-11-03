# AWS Quiz — DVA-C02 prep

React (Vite) frontend · Vercel serverless API (`/api`) · Neon Postgres. Installable as a PWA.

## Features
- **Study notes** with architecture diagrams, cheat-sheet tables, exam tips, read-tracking, bookmarks and offline access.
- **Practice**: 12 timed papers (exam mode) or untimed with instant feedback (practice mode); resume unfinished exams on any device; keyboard shortcuts (A–E / 1–5, ← →, F).
- **Custom practice**: weak areas, your mistakes, by domain, by topic, random mix.
- **Review**: mistake notebook + spaced-repetition flashcards (Leitner boxes), "study this topic" links from every question.
- **Compete**: invite friends with a link or code — same questions, same start time and time limit, live standings and a podium.
- **Dashboard**: exam-readiness score, score trend, accuracy by domain, streak + daily goal + activity heatmap, attempt history, per-question time.
- **Accounts**: sign-up/in, password reset and email verification, opt-in public leaderboard, guest mode (scores import on sign-in).
- **Admin** (`/admin`): review learner reports and edit questions in place.

## Setup
1. Vercel project → **Storage → Create → Neon** (sets `DATABASE_URL`).
2. Add the variables from `.env.example` in **Settings → Environment Variables** (`JWT_SECRET` is required).
3. First time only, load the questions and notes:
   ```bash
   node --env-file=.env.local scripts/seed.mjs     # or: npm run db:seed
   ```
4. Deploy. **The database schema is applied automatically** by the API on first use (it's idempotent), so deploys never need a manual migration. `npm run db:migrate` applies it on demand.

`db:seed` never overwrites questions that are already loaded (so admin edits are safe); use `npm run db:reset` to reload them from `src/`.

### Email
Without `RESEND_API_KEY` + `EMAIL_FROM`, password-reset and verification links are printed to the Vercel function logs. Set both to send real emails. The verification banner never blocks use of the app.

### Monitoring
Browser errors are reported to `/api/client-error` and stored in `client_errors`:
```sql
SELECT created_at, message, url FROM client_errors ORDER BY created_at DESC LIMIT 50;
```
Logins, sign-ups, resets and error reports are rate-limited (Postgres-backed).

## Local development
```bash
cp .env.example .env.local   # point DATABASE_URL at any Postgres
npm install
npm run db:seed
npm run dev:api              # API on :3001 (or use `vercel dev`)
npm run dev                  # Vite on :5173, proxies /api
```

## Layout
| Path | What |
|---|---|
| `api/index.js` | The single serverless function (Vercel's Hobby plan allows 12) |
| `server/` | API handlers + `routes.js` route table — add a handler here and register it in `routes.js` |
| `db/schema.js` | Idempotent Postgres schema |
| `scripts/seed.mjs` | Loads content from `src/` into the database |
| `shared/` | Code used by both the API and the browser (topic keywords) |
| `src/pages/` | Routed pages |
| `src/notesExtras.js` | Diagrams, tables and tips for the notes |
| `public/sw.js` | Service worker (offline notes, installable app) |
