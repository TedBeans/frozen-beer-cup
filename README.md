# Frozen Beer Cup

Live scoring, leaderboard and stats for the annual Frozen Beer Cup golf scramble (day after
Thanksgiving, The Quarry at Crystal Springs, Gold tees).

- **Board**: live leaderboard, refreshes every 5 seconds on every phone
- **Score**: hole-by-hole entry for a team, with optional "whose drive" and "who putted" taps
- **Cards**: full scorecards for every team
- **Holes**: par, yardage and an aerial map for all 18 holes
- **Stats**: team scoring, who carried the scramble, hardest holes, cup history and all-time player totals
- **Admin**: edit teams and handicaps, add players, start next year's event

Scoring is **gross score to par. No handicap strokes.** Handicaps are only stored to help build
even teams (the admin page shows a weighted team handicap for balance).

## Deploy on Vercel

1. Push this repo to GitHub (done) and import it in Vercel as a new project.
2. In the project, open **Storage**, add a **Neon Postgres** database and connect it to the project.
   Vercel sets `DATABASE_URL` for you.
3. Under **Settings, Environment Variables**, add `SCORER_PIN` (and optionally `ADMIN_PIN`).
4. Redeploy. The first page load creates the tables and seeds the 2026 teams.

Anyone with the link can watch. Entering scores or changing teams needs the PIN.

## Game day

1. Each team's scorer opens the site, taps **Score**, enters the PIN once, and picks their team.
   The phone remembers both.
2. After each hole, tap the score and **Save**. It jumps to the next hole.
3. Fix a mistake by tapping the hole number and saving again, or **Clear**.
4. If you lose signal, your number stays on screen. Tap Save again once you have bars.

## Next year

Open **Admin**, **Start a new year**. It copies the course, team names and each player's last
handicap, with everyone off a team so you can rebuild the teams. Past years stay in **Stats**.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and SCORER_PIN
npm run dev
npm test                     # scoring logic and database queries (in-memory Postgres)
```

With no `SCORER_PIN` set, writes only work in local development.

## Course data

`src/lib/course.ts` holds pars, yardage and stroke index from 18Birdies, plus the Gold tee rating
(69.8) and slope (125). Hole images are in `public/holes`. To use a different course or tee, add
it there.
