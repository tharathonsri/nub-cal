# Nub Cal

A daily nutrition tracker (kcal, protein, carbs, fat) supporting multiple users with no login — just type a name to create or resume a session.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind
- Drizzle ORM + `@libsql/client`, backed by a local SQLite file in dev and [Turso](https://turso.tech) in production
- Deployed on [Vercel](https://vercel.com)

## Local development

```bash
npm install
npm run dev
```

With no env vars set, the app uses a local SQLite file (`./local.db`). Push the schema to it with:

```bash
npm run db:push
```

## Using a real Turso database locally

Copy `.env.example` to `.env.local` and set `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` from a database created with the [Turso CLI](https://docs.turso.tech/cli/installation), then run `npm run db:push`.

## Deployment

Production is deployed on Vercel with `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` set as project env vars (Production + Preview). The GitHub repo is connected to the Vercel project, so pushes to `main` deploy automatically.

Live: https://nub-cal-seven.vercel.app
