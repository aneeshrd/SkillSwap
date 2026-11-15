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

**Video calls, built in**
Every confirmed session gets a call room at `/call/<id>`: camera, microphone,
screen sharing and a timer against the booked length. It is real peer-to-peer
WebRTC — SkillSwap relays the connection handshake over a WebSocket and nothing
else, so no audio or video ever passes through the server, and none is recorded.
The room only opens for the two students in the session, from 15 minutes before
the slot until two hours after it was due to end.

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
| Server | Custom Node server (`server.js`) — Next's handler plus a `ws` endpoint for call signalling |
| Realtime | WebRTC peer-to-peer; `ws` for signalling only |
| Database | SQLite via `better-sqlite3`, hand-written SQL, no ORM |
| Auth | `node:crypto` scrypt + server-side sessions. No third-party auth dependency |
| Validation | Zod on every server action |

There are six runtime dependencies in total. That is deliberate — a student
project that nobody can audit is not a safe place to send students.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the layering,
[`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) for the schema,
[`docs/CREDITS.md`](docs/CREDITS.md) for the ledger rules, and
[`docs/SAFETY.md`](docs/SAFETY.md) for the trust model.

---

## Project layout

```
server.js           Next + the WebSocket signalling endpoint at /ws/call
Dockerfile          single-stage-per-concern build, with the native toolchain
fly.toml            one machine, one volume — see "Deploying"
src/
  app/
    actions/        server actions — the only place data is written
    call/[id]/      the video call room
    dashboard/      signed-in area (overview, requests, sessions, wallet, profile, safety)
    admin/          moderation queue
    u/[handle]/     public profile + booking
    browse/ categories/ how-it-works/ safety/ signup/ login/ verify/
  components/
    forms/          client components, one per form
    ...             server-rendered UI primitives
  lib/
    schema.sql      the single source of truth for the database
    taxonomy.sql    the skill catalogue, applied to every database on connect
    call-token.ts   short-lived signed tickets admitting someone to a call
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

## Deploying

**What it costs.** Roughly **$5/month**. Fly.io retired its free allowance for
new organisations, so a single always-on `shared-cpu-1x` machine plus a 1GB
volume is about $4–5/month at current rates. Render and Railway land in the same
place. There is no free way to host this, because "always on with a persistent
disk" is the one thing free tiers don't give you.

SQLite plus in-memory call rooms means **one machine with a persistent disk**.
Not Vercel, Netlify or Cloudflare: serverless wipes the filesystem and spreads
requests across instances, so the ledger would vanish and two people in the same
call could land on different servers. `fly.toml` therefore pins a single machine,
and `fly scale count 2` would break both the database and calling.

### Fly.io

```bash
curl -L https://fly.io/install.sh | sh
fly auth signup
```

```bash
fly launch --no-deploy --copy-config --name your-app-name
```

```bash
fly volumes create skillswap_data --size 1 --region iad
```

```bash
fly secrets set \
  SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" \
  ALLOWED_EMAIL_DOMAINS="yourschool.edu" \
  ADMIN_EMAILS="you@yourschool.edu" \
  RESEND_API_KEY="re_..." \
  EMAIL_FROM="SkillSwap <noreply@yourdomain.edu>"
```

```bash
fly deploy
```

The first boot creates the tables and loads the 55-skill catalogue from
`src/lib/taxonomy.sql`. **Do not run the seed in production** — it creates
seventeen fictional students.

### Before students use it

1. **Email must work.** Sign up at [resend.com](https://resend.com) — the free
   plan is 3,000 emails a month **capped at 100 a day**, which is the limit a
   launch actually hits. Verify a sending domain you control, then set
   `RESEND_API_KEY` and `EMAIL_FROM`. Resend's shared `onboarding@resend.dev`
   sender is fine for a smoke test to your own address but not for real
   students. Without working email nobody can verify, so nobody can sign up.
2. **Add a TURN server, or some calls will fail.** WebRTC falls back to a relay
   when a network blocks direct connections, and university wifi frequently does.
   [Metered's open relay](https://www.metered.ca/tools/openrelay/) has a free
   tier; set `TURN_URL`, `TURN_USERNAME` and `TURN_CREDENTIAL`. Without one, the
   call page says so plainly when a connection fails rather than hiding it.
3. **Add your school** to the `schools` table so profiles show it. Accounts work
   without a matching row; they just show no school name.
4. **HTTPS is required** for camera access. Fly provides it; a plain-HTTP
   deployment will have working pages and broken calls.
5. **Schedule the sweep** — `npm run sweep` hourly — and remove the
   `settleStaleSessions()` call from `src/app/dashboard/layout.tsx`.
6. **Back up the volume.** The ledger is the system of record.

### Other hosts

**Render** and **Railway** both work the same way (one instance, one persistent
disk). Any Linux box with Node 22 works too: `npm ci && npm run build && npm start`
behind nginx with a TLS certificate.

## Known gaps

Stated plainly, because a pilot deserves an honest list:

- **Calls need a TURN server on restrictive networks.** STUN is built in and
  covers most connections; without TURN configured, some will fail outright.
- **Calls are one-to-one.** Two people per room, which is what a tutoring
  session is. Group sessions would need an SFU, which is a different project.
- **No password reset.** A student who forgets theirs needs a moderator.
- **No direct messaging.** Communication is the request message, the teacher's
  reply, and the call itself — deliberately, but it means rescheduling happens
  off-platform.
- **No calendar integration.** Availability is a hint; nothing prevents
  double-booking a slot.
- **Single node only.** Rate limits, call rooms and the database all assume one
  process.
- **No account deletion flow.** There's no self-serve way to exercise a deletion
  request.
- **Moderation is not staffed.** `ADMIN_EMAILS` is a list, not a rota, and there
  is no escalation path or SLA.
- **Verification proves a school email, not an identity.** Covered at length in
  [`docs/SAFETY.md`](docs/SAFETY.md) and on the in-app safety page, because
  students should understand the limit before they meet a stranger.

## Licence

MIT — see [LICENSE](LICENSE).

Credits have no cash value and cannot be bought, sold or transferred off the
platform. SkillSwap is a non-commercial student project.
