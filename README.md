# SkillSwap

**Your skills become your currency.**

A student skill-exchange platform. You list what you can teach and what you want
to learn, you earn **time credits** by helping someone, and you spend those
credits learning from *anyone else* on the platform — not just the person you
helped. No money is involved at any point.

SkillSwap is a working full-stack application, not a mock-up: real accounts,
real school-email verification, a real append-only credit ledger, real session
requests, ratings and a moderation queue.

---

## Why credits instead of direct swaps

Direct skill trading only works when two people happen to want exactly what the
other has, which almost never happens. A credit breaks that deadlock: the person
you help and the person who helps you never have to be the same person.

One credit is **30 minutes** of another student's time. The rate is the same for
everyone in every subject — an hour of first-year Spanish and an hour of graduate
econometrics both cost two credits. That is a deliberate choice, not an
oversight: pricing time by expertise rebuilds the money economy with extra
steps, and prices out the students who most need help.

---

## Quick start

```bash
git clone https://github.com/aneeshrd/skillswap.git
cd skillswap
npm install
```

```bash
cp .env.example .env.local
```

Generate a session secret and paste it into `.env.local` as `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Seed a demo community and start the app:

```bash
npm run db:reset && npm run dev
```

Open http://localhost:3000.

### Demo accounts

Every seeded student uses the password **`swapdemo1234`**.

| Role | Email |
| --- | --- |
| Learner *and* teacher, has credits and history | `maya.rodriguez@students.northfield.edu` |
| Busiest teacher, several ratings | `priya.nair@students.northfield.edu` |
| Has pending incoming requests to accept | `wei.chen@students.northfield.edu` |
| Unverified account (can browse, can't book) | `elena.petrova@students.northfield.edu` |
| Moderator — unlocks `/admin` | `dean.okafor@northfield.edu` |

Verification codes are **not** emailed in development. They are printed to the
terminal running `npm run dev`. Codes are stored as SHA-256 hashes, so no page
can ever show you one — including this one.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on :3000 |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:seed` | Seed into the existing database |
| `npm run db:reset` | Delete the database and reseed from scratch |
| `npm run sweep` | Release credits held by sessions that never resolved |

---

## What's built

**Accounts and verification**
School-email-only registration against a configured domain allowlist, a 6-digit
emailed code, scrypt password hashing, server-side revocable sessions, and
rate limiting on signup, login, verification and session requests.

**Profiles**
Bio, year, school, skills you teach (with a level and a note), skills you want
to learn, weekly availability, ratings and tag summaries. Public profiles never
expose an email address.

**Skill categories and search**
8 categories, 55 seeded skills. Full-text-ish search across names, bios and
skills, filtered by category, school and verification status.

**Matching**
Candidates are ranked against the viewer's own learning list, with a bonus for
two-way matches and same-school pairings. Every point added also appends a
human-readable reason, which the browse page shows under each card — if the
system can't say *why* it surfaced someone, it doesn't surface them.

**Sessions**
Request → accept/decline → happen → both confirm → both rate. Credits are held
when the request is sent and transferred only when *both* people confirm.

**Credits**
An append-only ledger. A balance is `SUM(delta)` and nothing else; there is no
mutable balance column anywhere, so every credit in the system is traceable to
a row with a reason attached.

**Safety and moderation**
Two-way blocking, categorised reports, a moderator queue with suspension
(which revokes live sessions immediately), manual verification, credit
corrections, and an audit log of every moderator action.

---

## Stack

| | |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, Server Actions) |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4 with a token-based design system in `src/app/globals.css` |
| Database | SQLite via `better-sqlite3`, hand-written SQL, no ORM |
| Auth | `node:crypto` scrypt + server-side sessions. No third-party auth dependency |
| Validation | Zod on every server action |

There are five runtime dependencies in total. That is deliberate — a student
project that nobody can audit is not a safe place to send students.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the layering,
[`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) for the schema,
[`docs/CREDITS.md`](docs/CREDITS.md) for the ledger rules, and
[`docs/SAFETY.md`](docs/SAFETY.md) for the trust model.

---

## Project layout

```
src/
  app/
    actions/        server actions — the only place data is written
    dashboard/      signed-in area (overview, requests, sessions, wallet, profile, safety)
    admin/          moderation queue
    u/[handle]/     public profile + booking
    browse/ categories/ how-it-works/ safety/ signup/ login/ verify/
  components/
    forms/          client components, one per form
    ...             server-rendered UI primitives
  lib/
    schema.sql      the single source of truth for the database
    db.ts           connection, migration, transactions
    auth.ts         passwords, sessions, verification codes
    credits.ts      the ledger
    matching.ts     explainable ranking
    sweep.ts        releases credits from sessions that never resolved
    queries.ts      every read
scripts/
  seed.ts           demo community
  sweep.ts          cron entry point
```

---

## Deploying a pilot

SQLite with `better-sqlite3` means **one node with a persistent disk** — a VPS,
Fly.io with a volume, Render, or a school-hosted box. It will not work on a
serverless platform where the filesystem is ephemeral and every request may hit
a different instance.

Before putting this in front of students:

1. Set a strong `SESSION_SECRET` and keep `.env.local` out of version control.
2. Set `ALLOWED_EMAIL_DOMAINS` to your school's real domains.
3. Set `ADMIN_EMAILS` to your actual moderators.
4. **Implement `smtpTransport` in `src/lib/email.ts`** and set
   `EMAIL_TRANSPORT=smtp`. Until you do, nobody can verify an account without
   access to the server log.
5. Unset `DEV_CODE_HINT`.
6. Serve over HTTPS — session cookies set `secure` in production.
7. Schedule `npm run sweep` hourly, and remove the `settleStaleSessions()` call
   from `src/app/dashboard/layout.tsx`.
8. Back up `data/skillswap.db`. The ledger is the system of record.

---

## Known gaps

Stated plainly, because a pilot deserves an honest list:

- **No email is actually sent.** The SMTP transport is a stub that throws.
- **No password reset.** A student who forgets their password needs a moderator.
- **No direct messaging.** Communication is limited to the request message and
  the teacher's reply, deliberately — but it means scheduling changes have to
  happen outside the platform.
- **No calendar integration.** Availability is a hint, not a booking system, and
  nothing prevents double-booking the same slot.
- **Single node only.** Rate limits live in SQLite and assume one process.
- **No account deletion flow.** There's no self-serve way to exercise a data
  deletion request.
- **Moderation is not localised or staffed.** `ADMIN_EMAILS` is a list, not a
  rota, and there is no escalation path or SLA.
- **Verification proves a school email, not an identity.** This is covered at
  length in [`docs/SAFETY.md`](docs/SAFETY.md) and on the in-app safety page,
  because students should understand the limit before they meet a stranger.

---

## Licence

MIT — see [LICENSE](LICENSE).

Credits have no cash value and cannot be bought, sold or transferred off the
platform. SkillSwap is a non-commercial student project.
