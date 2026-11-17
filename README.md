# Tower of Ascension tracker

Event tracker for The Duke clan's Tower of Ascension (Old School RuneScape).

- Everyone can view the tower, standings, team pages and the drop log. No sign-in.
- Admins sign in with one shared password plus their name, then log drops from the Teams tab.
- Every admin change and sign-in is written to an audit log (Admin tab).
- EHB gained per player comes from a Wise Old Man competition.

No framework and no build step: `public/` is the page, `api/` holds Vercel serverless functions, Postgres stores the data.

## Deploy to Vercel

1. Import this repo at vercel.com/new. Leave the framework preset as "Other".
2. In the project, open Storage and add a Neon Postgres database. That sets `DATABASE_URL`.
3. In Settings, Environment Variables, add `ADMIN_PASSWORD`.
4. Redeploy. Tables are created on the first request.

Changing `ADMIN_PASSWORD` signs every admin out.

## EHB tracking

1. On wiseoldman.net create a team competition covering the event dates and add every player.
2. Sign in on the Admin tab and paste the competition ID (the number in its URL).

Players are matched to teams by RSN against each team's member list, falling back to the Wise Old Man team name. Results are cached for 10 minutes.

## Run locally

```
npm install
npm run dev
```

`npm run dev` reads `DATABASE_URL` and `ADMIN_PASSWORD` from `.env.local` (git-ignored). Copy `.env.example` to start one.

## Changing the board

The 30 floors live in the `FLOORS` constant at the top of the script in `public/index.html`.
