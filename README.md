# White Blazes

A tracker for hiking the Bruce Trail, Queenston to Tobermory. Log your hikes, see which stretches of the white-blazed main trail you've covered, and follow your progress toward each club's end to end badge.

Badges are ordered through each Bruce Trail club. This app only tracks progress.

Built with Next.js and Supabase.

## Run it locally

You need Node 20+ and Docker.

```bash
npm install
npm run db:start   # local Supabase
npm run db:reset   # apply migrations and demo data
npm run dev
```

Notes on how it's built are in [`docs/`](docs/).

Trail data © OpenStreetMap contributors, ODbL.
