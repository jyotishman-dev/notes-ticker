# TrackForge

A learning tracker: tracks → phases → tasks, each task with a spot to write notes on what you actually did.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS, hand-rolled shadcn-style components
- Prisma + PostgreSQL
- Server Actions (no separate API layer needed)

## Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up Postgres**
   - Easiest: create a free Postgres DB on [Neon](https://neon.tech) or [Supabase](https://supabase.com), or run one locally:
     ```bash
     docker run --name trackforge-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=trackforge -p 5432:5432 -d postgres
     ```
   - Copy `.env.example` to `.env` and set `DATABASE_URL`.

3. **Push the schema**
   ```bash
   pnpm db:push
   ```

4. **Seed sample data** (optional, matches the reference screenshot)
   ```bash
   pnpm db:seed
   ```

5. **Run it**
   ```bash
   pnpm dev
   ```
   Open http://localhost:3000

## What's included
- `/` — dashboard: track cards with progress %, tasks done, streak, today count
- `/tracks/[id]` — phase sidebar + checklist for a track; click "Add note" on any task to jot what you did
- `lib/actions.ts` — server actions: `toggleTask`, `updateTaskNotes`, `addTask`, `createTrack`
- `prisma/schema.prisma` — `Track → Phase → Task`, plus `Session` for time tracking (not wired into UI yet — `durationSeconds` needs a timer to write to it)

## Next steps you'll probably want
- A "Start Session" timer that writes to `Session` (for the Total Time stat)
- A page to create a new track (`createTrack` action already exists — just needs a form)
- Auth if you want this to be multi-user; right now it's single-user/local
- Drag-to-reorder tracks/phases (the `order`/`index` fields are already there to support it)
