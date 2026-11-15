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

## Database

`better-sqlite3`, synchronous, one connection per process. WAL mode lets
readers run while a writer holds the lock, and `busy_timeout` absorbs the rest.
Synchronous SQLite in a request handler sounds alarming and isn't — a prepared
statement against an indexed table resolves in microseconds, far faster than the
network round-trip a hosted database would cost.

`src/lib/schema.sql` is the single source of truth. `db.ts` executes it on first
connection; every statement is `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF
NOT EXISTS`, so it is safe to run on every boot.

**There is no migration tool.** For a pilot that is a reasonable trade — but it
means an additive change (a new table, a new index) is free, while a
destructive one (renaming a column, tightening a constraint) needs a hand-written
migration and a backup. Plan for that before the first real student signs up.

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
