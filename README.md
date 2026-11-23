# CIUP Events Calendar

The events calendar of the Cité internationale universitaire de Paris. Houses and associations publish events, the CIUP events team reviews them, and residents browse, filter and subscribe.

- **Visitors / residents** (no account): month and list views, category filters, search, event pages, "I'm interested" list, `.ics` downloads, calendar feed, weekly email.
- **Organisers** (email magic link): submit, edit and delete their own events, save drafts, follow review status.
- **Admins** (CIUP events team): review queue (approve, or reject with a reason), edit any event, all-events table, category and venue management.

French is the default language; English is one click away (the choice is stored in a cookie).

## Stack

Next.js 16 (App Router, server actions) · TypeScript · Tailwind CSS 4 · Prisma 6 (SQLite in dev, PostgreSQL in production) · Auth.js v5 (email magic link) · zod · Vitest · lucide-react.

> Prisma is pinned to the 6.19 line: at the time of writing the `latest` npm tag of `prisma` points to an 8.0 release candidate.
> `next-auth` v5 is still published as a beta and requires nodemailer 7 or 8, hence the pinned versions.

## Getting started

Requirements: Node.js 20.9+ (tested on Node 24).

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # then set AUTH_SECRET (openssl rand -base64 32)
npm run db:push             # creates prisma/dev.db (SQLite)
npm run db:seed             # categories, venues + 29 SAMPLE events (24 published, 5 in review/draft/rejected)
npm run dev                 # http://localhost:3000
```

### Signing in during development

There is no SMTP server in development: every email (magic links, approval/rejection notices, newsletter) is **printed in the terminal running `npm run dev`**. Go to `/signin`, enter any address, then open the link from the terminal.

### Making a user admin

```bash
npm run make-admin -- events@ciup.fr            # creates the user if needed and sets role ADMIN
npm run make-admin -- events@ciup.fr --revoke   # back to ORGANISER
```

Alternatively, list addresses in `ADMIN_EMAILS` (comma-separated): they become admins the first time they sign in. This is handy on hosted environments where you cannot run scripts. It only applies when the account is created, after the address has been proven through the magic link.

### Sample data

The seed creates fictional organisers ("… (exemple)", emails on the reserved `@sample.ciup.test` domain) and events across this month and next, all flagged `isSample = true`. Sample events show an **Exemple / Sample** badge in the agenda, on the event page and in the admin table. Re-running the seed replaces them; `npm run db:unseed` removes them (and the sample users) without touching anything else. `npm run db:reset` wipes the local database and re-seeds.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` (SQLite) or `postgresql://…`. The Prisma provider is switched automatically from the scheme. |
| `AUTH_SECRET` | yes | Encrypts Auth.js tokens. `openssl rand -base64 32`. |
| `APP_URL` | yes in prod | Public base URL, used in emails, the ICS feed and Open Graph tags. |
| `AUTH_TRUST_HOST` | outside Vercel | `true` when running behind your own proxy. |
| `EMAIL_FROM` | yes in prod | Sender, e.g. `CIUP Événements <evenements@ciup.fr>`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | yes in prod | Outgoing mail. Without `SMTP_HOST`, mail is printed to the console in dev and **refused** in production (so magic links never end up in production logs). |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | for push | Web push keys. Generate a pair with `npx web-push generate-vapid-keys`. Without them the notification button is disabled. |
| `CRON_SECRET` | for the alerts | Bearer secret protecting `/api/cron/daily-push`. The route refuses to run if it is unset. |
| `UPLOAD_STORAGE` | no | `disk` (default) or `database` (images stored in the `Upload` table, for hosts without a persistent disk such as Render's free plan). |
| `UPLOAD_DIR` | no | Where uploaded images are stored on disk (default `./uploads`). |
| `BLOB_READ_WRITE_TOKEN` | on Vercel | Store uploads in Vercel Blob instead of the local disk (the Vercel filesystem is not persistent). |
| `ADMIN_EMAILS` | no | Bootstrap admins (see above). |
| `DATABASE_PROVIDER` | no | `postgresql` or `sqlite`: forces the Prisma provider instead of reading it from `DATABASE_URL` (set on Render). |
| `DEMO_MODE` | test sites only | `true`: no email is ever sent; the sign-in link is shown on screen to the browser that asked for it, and pages are `noindex`. **Anyone can then sign in with any address, including admin ones.** For user tests only. |
| `SEED_SAMPLES` | no | `refresh`: makes the start-up seed on Render re-create the sample events (see below). |
| `COPY_FROM_DATABASE_URL` | one-off | PostgreSQL database to copy everything from when the start-up on Render finds an empty database (used to move from Render's database to Supabase; see "Shared database on Supabase"). |
| `ALLOW_DB_PUSH` | no | `1`: lets `db:push` / `db:reset` run against a (throwaway) PostgreSQL database. |

## Deploying on Render (test deployment for user tests)

`render.yaml` is a Render Blueprint: one free web service in Frankfurt, set up in **demo mode** for user tests. Its data lives in the team's Supabase database (next section). The Blueprint still declares the former Render database, `ciup-events-db`, only as the source of the one-off copy to Supabase.

1. On [dashboard.render.com](https://dashboard.render.com): **New > Blueprint**, connect GitHub and pick this repository. Render reads `render.yaml`, lists `ciup-events` (web service) and asks for `DATABASE_URL`: paste the Supabase **Session pooler** connection string (see below). Click **Deploy Blueprint**.
2. Wait for the first deploy (about 5 minutes). The site is then at `https://ciup-events-XXXX.onrender.com` (the address is shown on the service page).
3. Every push to `main` redeploys automatically.

What happens on each start: pending migrations are applied (`prisma migrate deploy`), the one-off copy from the old Render database runs if the database is still empty (`scripts/copy-db.ts`, see below), the seed fills an **empty** database with categories, houses and sample events, then `next start` runs. A database that already has events is left alone, so testers' data survives restarts. To get fresh sample events (their dates are relative to the day they were created), set `SEED_SAMPLES=refresh` in the service's **Environment** tab, let it redeploy, then remove the variable.

Signing in on the test site: there is no email. Testers enter any address and the "check your inbox" page shows a button with their sign-in link. Any address gets the organiser role; **`admin@demo.ciup.test`** gets the admin role (`ADMIN_EMAILS` in `render.yaml`).

Free-plan limits, from [Render's docs](https://render.com/docs/free):

- **The service sleeps after 15 minutes without visitors.** The next visit takes about a minute to wake it up. Open the site a few minutes before a test session.
- **Render's free database expires 30 days after it is created**, which is why the data is on Supabase.
- **Outbound email (SMTP) is blocked**, which is why the Blueprint enables `DEMO_MODE`. To send real emails, move the service to a paid instance, set the `SMTP_*` variables and remove `DEMO_MODE`.
- **The disk is wiped on every restart**, which is why images are stored in the database (`UPLOAD_STORAGE=database`).
- **No cron jobs on the free plan**, so the daily push alerts are not scheduled. Push notifications themselves work once VAPID keys are added (run `npx web-push generate-vapid-keys` locally, then add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in the service's Environment tab). A free external scheduler can call `/api/cron/daily-push` with `Authorization: Bearer <CRON_SECRET>`.

Do not use this Blueprint for the real site: demo mode lets anyone sign in as anyone.

## Shared database on Supabase

The test site's data lives in a Supabase PostgreSQL project, **`ciup-events`** (Frankfurt), rather than on Render. It does not expire, everyone on the team can look at it, and a local copy of the app can connect to it.

**Access.** Ask the project owner to invite you to the Supabase organisation (Supabase dashboard > Organization settings > Team > Invite). From there you can browse and edit every table (Table Editor), run SQL (SQL Editor), and copy the connection string (**Connect** > **Session pooler**). The dashboard never shows the database password. Get it from the owner privately, never through git, an issue or a group chat.

**Connection string.** Always use the **Session pooler** (IPv4, port 5432). The "direct connection" host is IPv6-only on the free plan, which Render and most home networks cannot reach.

```
postgresql://postgres.<project-ref>:<password>@aws-<n>-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5
```

`connection_limit=5` keeps each running app well inside the free plan's connection pool, which the test site and everyone's local copies share.

**Running your local copy on the shared data.** Put that string in `.env` as `DATABASE_URL`, run `npm install` (it switches Prisma to PostgreSQL and regenerates the client), then `npm run dev`. To go back to your own SQLite data, set `DATABASE_URL="file:./dev.db"` again and re-run `npm install`.

- This is the test site's live data: what you create, change or delete locally, testers see. Sign-in links still appear in your terminal (no demo mode locally).
- `npm install` rewrites the `provider` line of `prisma/schema.prisma` to `"postgresql"`. Leave that one-line change out of your commits.
- `npm run db:push` and `npm run db:reset` refuse to run against PostgreSQL: they would bypass the migrations or wipe everyone's data. `npm run db:seed` re-creates and `npm run db:unseed` deletes the sample events for everyone, so agree on it first.

**Changing the schema.** The shared database only changes through migrations, and Render applies them on every deploy. After editing `prisma/schema.prisma`, generate the migration against a throwaway PostgreSQL, never against Supabase (`prisma migrate dev` can reset the database it runs on). For example, with Docker:

```bash
docker run --rm -d -p 5433:5432 -e POSTGRES_PASSWORD=pg --name ciup-pg postgres:17
export DATABASE_URL=postgresql://postgres:pg@localhost:5433/postgres
node scripts/set-db-provider.mjs && npx prisma migrate dev --name <change>
docker stop ciup-pg
```

Commit the new `prisma/migrations/<…>` folder and push to `main`; the next deploy migrates Supabase. SQLite users run `npm run db:push` after pulling it, as usual.

**Moving the data from Render's database (one-off).**

1. In Render: `ciup-events` > **Environment** > set `DATABASE_URL` to the Session pooler string > **Save, rebuild, and deploy**.
2. On that start, the migrations create the tables in Supabase. Then `scripts/copy-db.ts` copies every row from the old database (`COPY_FROM_DATABASE_URL`, filled in by `render.yaml`): users, sessions (testers stay signed in), events, images and the rest. It only copies into an **empty** database, in a single transaction, so it either lands completely or not at all (the deploy then fails and the previous version keeps running). The deploy log shows `[copy-db] Copied into the new database: …`. Later starts skip it.
3. Once the site runs on Supabase, delete `COPY_FROM_DATABASE_URL` and the `databases:` block from `render.yaml`, then delete `ciup-events-db` in the Render dashboard.

**Free-plan limits (Supabase).** 500 MB of database per project (images are stored in it, which is plenty for tests), two free projects per account, and inactive free projects are paused after about a week. A paused project is restored from the dashboard.

## Deploying (Vercel + PostgreSQL)

1. **Create a PostgreSQL database** (Neon, Vercel Postgres/Neon, Supabase, RDS…).
2. **Create the Vercel project** from the repository and set the environment variables above. Use the *direct* (non-pooled) connection string for `DATABASE_URL`, or the pooled one with `&pgbouncer=true` (in that case run migrations yourself with the direct URL, see step 4).
3. **Build command:** set it to `npm run vercel-build`. It applies pending migrations (`prisma migrate deploy`), switches the Prisma provider to `postgresql` and builds.
4. **Migrations:** production uses the PostgreSQL migrations in `prisma/migrations/` (`npm run db:deploy`). Local development uses `prisma db push` on SQLite, so do not run `prisma migrate dev` against SQLite. After changing `schema.prisma`, generate the next migration against a PostgreSQL database:
   ```bash
   DATABASE_URL=postgresql://… node scripts/set-db-provider.mjs
   DATABASE_URL=postgresql://… npx prisma migrate dev --name <change>
   node scripts/set-db-provider.mjs   # back to SQLite for local dev
   ```
5. **Uploads:** create a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`.
6. **Daily alerts:** `vercel.json` schedules `/api/cron/daily-push` every day at 05:00 UTC (06:00 or 07:00 in Paris). Devices that turned on notifications get a push message only on days when a restriction affects the houses they follow. Set `CRON_SECRET`; Vercel sends it automatically. Any other scheduler can call the route with `Authorization: Bearer $CRON_SECRET`.
7. **Seed reference data once** (categories and venues; skip the sample events in production):
   ```bash
   DATABASE_URL=postgresql://… npm run db:seed && DATABASE_URL=postgresql://… npm run db:unseed
   DATABASE_URL=postgresql://… npm run make-admin -- events@ciup.fr
   ```

Any Node host works too: `npm ci && npm run db:deploy && npm run build && npm start`.

## How it works

### Pages

| Route | Who | |
| --- | --- | --- |
| `/` | everyone | Calendar: month grid (Monday first) or list, Agenda for the selected day, "Never miss an event" box. Filters live in the URL: `?month=2026-12&category=sport,culture&q=jazz&view=list&mine=1&day=2026-12-05`. |
| `/events/[id]` | everyone | Shareable event page with Open Graph / Twitter tags and a generated share image. Unpublished events are only visible to their author and admins. |
| `/submit` | organisers | Submission form ("Save draft" / "Submit for review"). |
| `/my-events`, `/my-events/[id]/edit` | organisers | Own events with status badges, rejection reasons, edit, delete. |
| `/admin` | admins | Tabs: review queue, all events (status filter, pagination), categories, venues. `/admin/events/[id]/edit` edits any event. |
| `/signin` | — | Magic-link sign-in. |
| `/newsletter/confirm`, `/newsletter/unsubscribe` | — | Double opt-in pages. They show a button (POST): mail scanners that prefetch links cannot subscribe or unsubscribe anyone. |

### Feeds and API

- `GET /api/calendar.ics?category=sport,culture&lang=fr|en` — public feed of published events (from 30 days ago, plus running series). Recurring events use `RRULE`, times use `TZID=Europe/Paris` with a `VTIMEZONE`, lines are folded at 75 octets.
- `GET /api/events/[id]/ics[?date=YYYY-MM-DD]` — download one event (or one occurrence of a series).
- `POST /api/upload` — image upload (signed-in users; JPEG/PNG/WebP detected from the file bytes, 2 MB max).
- `GET /api/cron/daily-push` — sends today's restriction push notifications (bearer secret).
- Mutations are **server actions** (`src/actions/*`), each checking the session and role on the server.

### Event workflow

```
organiser: Save draft ─► DRAFT ──Submit for review──► PENDING ──admin approves──► PUBLISHED
                                                          └──admin rejects (reason)─► REJECTED ─► edit & resubmit
```

- Organisers only ever produce `DRAFT` or `PENDING`, and only on their own events. Editing a published event sends it back to review (the form says so).
- Admins can approve or reject from the queue, or edit any event ("Save changes" keeps the status, "Save and publish" publishes it). Admin edits may concern past events.
- The organiser receives an email on approval and on rejection (with the reason). Email failures are logged and never block the review.
- Drafts are lenient (title, category, date, times and venue are enough); submitting requires everything.

### Validation (`src/lib/validation.ts`)

One zod-based validator is shared by the form (instant feedback) and the server (authoritative): description ≤ 400 characters, end after start, no past dates, real calendar dates, `http(s)` URLs only (no `javascript:`), valid email, a custom location for the "Other" venue, and a repeat end date within one year. Error messages are translation keys.

### Dates, time zone and recurrence

Everything is entered and displayed in **Europe/Paris**, whatever the server's time zone. Instants are stored in UTC. Weekly and monthly series are expanded on the fly (`src/lib/recurrence.ts`), keep their wall-clock time across daylight-saving changes, and skip months without the day (a series on the 31st), matching RRULE semantics.

### Accessibility

Real buttons and labels throughout. Errors are tied to their fields (`aria-invalid`, `aria-describedby`) and focus moves to the first invalid field. The month grid supports arrow keys, Home and End (roving tabindex). Toggles use `aria-pressed` and the expandable cards `aria-expanded`. There is a skip link, visible focus rings, and reduced-motion support. Every interactive control is at least 44 px; native checkboxes are 24 px inside 44 px clickable labels. On phones the month grid shows coloured dots instead of chips (no horizontal scrolling) and the Agenda stacks below. Category colours are checked against 4.5:1 when admins edit them.

axe-core (WCAG 2.0/2.1/2.2 A and AA plus best practices) reports no violations on the calendar (month, list, expanded card, 390 px), event page, sign-in, submit form, My events and all admin tabs, in both languages.

**Known gap, needs a design decision:** the specified input border `#CFCFC6` has a 1.57:1 contrast against white. WCAG 1.4.11 asks for 3:1 on form-field boundaries. It is a single token (`--color-field` in `src/app/globals.css`); `#8C8D84` (3.36:1 on white, 3.12:1 on the page background) passes.

## Project structure

```
prisma/            schema.prisma · seed.ts · migrations/ (PostgreSQL)
scripts/           set-db-provider.mjs (sqlite <-> postgresql) · make-admin.ts
src/app/           routes (pages, route handlers, Open Graph image)
src/actions/       server actions: events, admin, interest, subscribe, session
src/components/    calendar/ · forms/ · admin/ · events/ · layout/ · ui/
src/lib/           auth, permissions, db, queries, validation, dates, recurrence, ics, feed,
                   digest, email (+ templates), storage, i18n/ (fr.ts, en.ts)
tests/             validation, ICS and recurrence unit tests
```

Adding a UI string: add it to `src/lib/i18n/fr.ts`. TypeScript then requires the same key in `en.ts`.

## Scripts

| | |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest: validation, ICS feed, recurrence and calendar grid |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` / `db:deploy` / `db:seed` / `db:unseed` / `db:reset` | database (`db:push` and `db:reset` are for the local SQLite file only) |
| `npm run make-admin -- <email>` | grant admin |

## Before going live

- Replace the placeholder mark (`src/components/layout/Logo.tsx`, `src/app/icon.svg`) with the official CIUP logo.
- Decide on the input border colour (see Accessibility).
- Magic-link requests are not rate-limited by Auth.js. Put rate limiting on `POST /api/auth/signin/email` at your proxy or WAF (or Vercel Firewall).
- Search covers the displayed month (title, venue and organiser, accent-insensitive).
- `next dev` writes an `AGENTS.md` file at the project root (a Next.js 16 feature). Commit it or set `agentRules: false` in `next.config.ts`.
