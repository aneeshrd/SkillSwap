# Architecture

## Shape

A single Next.js 15 application using the App Router. Pages are React Server
Components that read directly from SQLite; every write goes through a Server
Action. There is no separate API layer, because there is no separate client to
serve — and one less layer is one less place for an authorisation check to be
forgotten.

```
Browser
  │
  ├── GET  →  Server Component  →  src/lib/queries.ts  →  SQLite
  │
  └── POST →  Server Action     →  src/app/actions/*   →  src/lib/*  →  SQLite
                                      │
                                      └── Zod validation, auth check, rate limit
```

## Layering rules

| Layer | May do | May not do |
| --- | --- | --- |
| `src/app/**/page.tsx` | Read via `queries.ts`, render | Write; contain SQL |
| `src/app/actions/*` | Validate, authorise, call `lib/*` | Contain business rules |
| `src/lib/credits.ts`, `matching.ts`, `sweep.ts` | Own the rules | Know about HTTP or forms |
| `src/lib/queries.ts` | All reads | Write |
| `src/lib/db.ts` | Connection, migration, transactions | Know about domain concepts |

Every server action starts the same way: resolve the session, check the
permission, validate with Zod, then act. `requireUser`, `requireVerifiedUser`
and `requireAdmin` in `src/lib/session.ts` are the only three gates.

## Video calls

Calls are peer-to-peer WebRTC. The server's only job is introductions.

```
Maya's browser                 server.js                 Wei's browser
      |                            |                            |
      |-- ws /ws/call?token=... -->|<-- ws /ws/call?token=... ---|
      |<------- peer-joined -------|                            |
      |------------- offer ------->|---------- offer ---------->|
      |<------------ answer -------|<--------- answer ----------|
      |<----------- ice -------- --|---------- ice ------------>|
      |                            |                            |
      |=========== audio / video, directly between them ========|
```

**Admission.** The WebSocket server shares no database connection and no session
cookie with the app. Instead `/call/[sessionId]` authorises the request the
normal way — signed in, verified, one of the two people on an *accepted* session,
inside the time window — and then mints a **call ticket**: a two-minute,
HMAC-signed assertion of `{sessionId, userId, name}` (`src/lib/call-token.ts`).
`server.js` verifies that signature with `SESSION_SECRET` and admits the socket.
One shared secret, no shared state.

**Rooms** are keyed by session id and hold at most two sockets. A reconnection
from the same user replaces their previous socket rather than filling the room
with a ghost, and a 30-second ping sweeps dead connections.

**Negotiation** avoids the usual glare problem by construction: whoever is
already waiting makes the offer, and the arriver answers. With two participants
that is deterministic, so neither perfect-negotiation rollback nor politeness
tie-breaking is needed.

**Screen sharing** swaps the outgoing video track with `replaceTrack`, which
needs no renegotiation. Mute and camera toggles flip `track.enabled`, so the
senders stay in place and the connection is never rebuilt mid-session.

**Media never touches the server**, and nothing is recorded. The trade-off is
that a direct connection isn't always possible: STUN handles most networks, and
the rest need a TURN relay (`TURN_URL`). Campus wifi is a common offender, so a
pilot should configure one. When a connection fails the UI says which case it is
rather than showing a generic error.

## Database

`better-sqlite3`, synchronous, one connection per process. WAL mode lets
readers run while a writer holds the lock, and `busy_timeout` absorbs the rest.
Synchronous SQLite in a request handler sounds alarming and isn't — a prepared
statement against an indexed table resolves in microseconds, far faster than the
network round-trip a hosted database would cost.

`src/lib/schema.sql` is the single source of truth for structure, and
`src/lib/taxonomy.sql` for the skill catalogue. `db.ts` executes both on first
connection. Every statement is `CREATE ... IF NOT EXISTS` or `INSERT OR IGNORE`,
so running them on every boot is safe — and a brand-new deployment comes up with
its tables and 55 skills already in place, with no migration step and no seed.

The demo seed (`npm run db:seed`) sits on top of that and only creates people:
students, sessions, ratings and a report. It never touches the catalogue, so it
is the one thing you must *not* run in production.

**There is no migration tool.** For a pilot that is a reasonable trade — but it
means an additive change (a new table, a new index) is free, while a
destructive one (renaming a column, tightening a constraint) needs a hand-written
migration and a backup. Plan for that before the first real student signs up.

## Single node, on purpose

Three things in this application are per-process: the SQLite file, the
fixed-window rate limiter, and the in-memory map of call rooms. A second
instance would serve a different database, enforce its own separate rate limits,
and host a different set of rooms — so two people in the same session could land
on different machines and never connect.

`fly.toml` therefore pins one machine. Scaling horizontally is not a config
change; it means Postgres, Redis and a signalling service that shares room state.

## Why no ORM

The schema is 15 tables and the queries are the interesting part of the system —
the match ranking, the public-user projection, the ledger aggregates. Hand-written
SQL keeps them readable and reviewable, which matters more here than it would in
a CRUD app. Row types are declared by hand in `src/lib/types.ts`; they are a
contract with the SQL, and if they drift, TypeScript will not save you. Keep
them next to each other when you change either.

## Authentication

- **Passwords**: scrypt from `node:crypto` (N=16384, r=8, p=1), 16-byte random
  salt, stored as `scrypt$N$r$p$salt$key`. Verified with `timingSafeEqual`.
- **Sessions**: a 32-byte random token in an httpOnly, SameSite=Lax cookie,
  signed with an HMAC so a forged cookie is rejected without a database hit.
  The server stores only `sha256(token)`.
- **Revocation**: sessions are server-side rows, so suspending an account
  invalidates every live login on the next request. The lookup joins
  `is_suspended = 0`, which means a suspended user is logged out everywhere
  the moment the flag is set.
- **Verification codes**: 6 digits via `crypto.randomInt`, stored as SHA-256,
  20-minute expiry, 6 attempts, superseded on resend.

No third-party auth library. The whole thing is ~250 readable lines, and a
student project that nobody can audit is not a safe place to send students.

## Rate limiting

A fixed-window counter in SQLite (`src/lib/rate-limit.ts`), applied to signup,
login, verification, code resends, session requests and reports. It assumes one
process. If you ever run more than one instance, move it to Redis — otherwise
each instance enforces its own limit and the effective limit multiplies.

## Matching

`src/lib/matching.ts` is pure: it takes a candidate and the viewer's skill sets
and returns a score plus the reasons that produced it. Every point added also
appends a human-readable reason, and the UI shows them. That constraint is the
design — a ranking you can't explain to the student it ranked is one you can't
debug or defend.

Candidates are filtered in SQL (blocks, suspension, category, school, text) and
scored in JavaScript, capped at 400 candidates. That is fine for a campus-scale
pilot and would need rethinking at a different order of magnitude.

## Styling

Tailwind v4 with a token layer. Raw colour values live on `:root` in
`src/app/globals.css` and are re-declared under
`@media (prefers-color-scheme: dark)`; `@theme inline` exposes them to Tailwind
as semantic utilities (`bg-paper`, `text-muted`, `border-line`). Component
classes (`.btn`, `.card`, `.pill`, `.input`) live in `@layer components` so
markup stays readable.

Both themes are first-class. There is no theme toggle — the app follows the
system preference.

## Deliberately absent

- **An ORM and a migration tool** — see above.
- **A client-side state library** — Server Components and Server Actions cover
  every interaction here. The only client components are forms.
- **Direct messaging** — it is the single largest moderation surface in a
  student platform, and the request message plus the teacher's reply covers
  the scheduling case.
- **File uploads** — avatars are initials. No upload means no image moderation
  problem, no storage bill and no CSAM reporting obligation.
- **Payments** — there is no payment code path, which is the point.
