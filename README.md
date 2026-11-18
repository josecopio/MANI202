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
| `CRON_SECRET` | for the digest | Bearer secret protecting `/api/cron/weekly-digest`. The route refuses to run if it is unset. |
| `UPLOAD_DIR` | no | Where uploaded images are stored on disk (default `./uploads`). |
| `BLOB_READ_WRITE_TOKEN` | on Vercel | Store uploads in Vercel Blob instead of the local disk (the Vercel filesystem is not persistent). |
| `ADMIN_EMAILS` | no | Bootstrap admins (see above). |

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
6. **Weekly email:** `vercel.json` schedules `/api/cron/weekly-digest` every Monday at 07:00 UTC (08:00 or 09:00 in Paris). Set `CRON_SECRET`; Vercel sends it automatically. Any other scheduler can call the route with `Authorization: Bearer $CRON_SECRET`.
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
- `GET /api/cron/weekly-digest` — sends the weekly email (bearer secret).
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
| `npm run db:push` / `db:deploy` / `db:seed` / `db:unseed` / `db:reset` | database |
| `npm run make-admin -- <email>` | grant admin |

## Before going live

- Replace the placeholder mark (`src/components/layout/Logo.tsx`, `src/app/icon.svg`) with the official CIUP logo.
- Decide on the input border colour (see Accessibility).
- Magic-link requests are not rate-limited by Auth.js. Put rate limiting on `POST /api/auth/signin/email` at your proxy or WAF (or Vercel Firewall).
- Search covers the displayed month (title, venue and organiser, accent-insensitive).
- `next dev` writes an `AGENTS.md` file at the project root (a Next.js 16 feature). Commit it or set `agentRules: false` in `next.config.ts`.
