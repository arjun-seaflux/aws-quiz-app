# AWS Quiz — DVA-C02 prep

React (Vite) frontend + Vercel serverless API (`/api`) + Neon Postgres.

- Study notes with diagrams, practice papers, accounts, score history and a dashboard.
- Guests can use everything; scores are kept in the browser until they sign in (then they're imported).
- If the API/database is unavailable the app still works as a guest using bundled content.

## One-time production setup (Vercel)

1. Vercel project → **Storage → Create → Neon** (sets `DATABASE_URL`).
2. Project → **Settings → Environment Variables** → add `JWT_SECRET` (`openssl rand -base64 32`).
3. Pull env locally and load the content into the database:
   ```bash
   vercel env pull .env.local
   npm run db:seed        # creates tables + loads papers, questions and notes
   ```
   Re-run `npm run db:seed` whenever the question/notes files change (user data is never touched).
4. Redeploy.

## Local development

```bash
cp .env.example .env.local   # point DATABASE_URL at any Postgres
npm install
npm run db:seed
npm run dev:api              # API on :3001  (or use `vercel dev`)
npm run dev                  # Vite on :5173, proxies /api
```

## Layout

| Path | What |
|---|---|
| `api/` | Serverless functions: auth, attempts, stats, papers, notes |
| `db/schema.sql` | Postgres schema |
| `scripts/seed.mjs` | Loads content from `src/` into the database |
| `src/pages/` | Routed pages (home, notes, practice, exam, dashboard) |
| `src/notesExtras.js` | Diagrams, cheat-sheet tables and exam tips for the notes |
