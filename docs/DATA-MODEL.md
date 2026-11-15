# Data model

The authoritative version is [`src/lib/schema.sql`](../src/lib/schema.sql).
This document explains the parts that aren't obvious from the DDL.

## Conventions

- Ids are text (`crypto.randomUUID`).
- Timestamps are ISO-8601 UTC strings (`2026-03-14T18:05:00.000Z`). They sort
  lexicographically, which is why plain string comparison works in the queries.
- Booleans are `INTEGER` 0/1.
- `PRAGMA foreign_keys = ON` is set on every connection.

## Tables

### `schools`
A school and the email domains that map to it. A registering student is
assigned to a school by matching their email domain against `email_domains`
(comma-separated). Matching accepts subdomains, so `students.northfield.edu`
matches a `northfield.edu` entry.

### `skill_categories` / `skills`
A fixed two-level taxonomy. Students pick from `skills`; they can't invent
them. That is a deliberate constraint — free-text skills fragment search
("Calc 1", "calculus I", "Calculus 1") and make category browsing meaningless.
The cost is that adding a skill requires a seed change.

### `users`
One row per student. Notes:

- `handle` is the public URL slug, derived from the name and de-duplicated.
- `email` is stored lowercase and **never** exposed by any query the UI uses —
  see `PUBLIC_USER_SELECT` in `queries.ts`, which is the only projection the
  public pages touch.
- `verification_status` is `unverified | pending | verified | rejected`.
  Unverified accounts can browse but cannot book or be booked.
- `is_suspended` is checked in the session lookup, so setting it logs the
  account out everywhere on its next request.

### `user_skills`
One row per `(student, skill, direction)`. `kind` is `teach` or `learn`, which
keeps both directions in one table and makes the match query a single join.
`UNIQUE (user_id, skill_id, kind)` stops duplicates; a student may list the
same skill in both directions, which is unusual but not wrong.

### `availability`
Weekly recurring blocks (`weekday`, `start_minute`, `end_minute`). It is a
display hint shown on a profile, **not** a booking calendar — nothing in the
system prevents a request outside these hours, or double-booking a slot.

### `sessions`
The session row *is* the request. There is no separate requests table; `status`
carries the row through its whole life:

```
pending ──accept──→ accepted ──both confirm──→ completed
   │                    │
   │                    ├──cancel──→ cancelled
   │                    └──14d, unconfirmed──→ expired
   ├──decline──→ declined
   ├──cancel──→ cancelled
   └──24h past slot, unanswered──→ expired
```

`CHECK (learner_id <> teacher_id)` at the database level, because
self-dealing is the obvious attack on a credit system and an application-level
check is one refactor away from being skipped.

`credits` is stored on the row rather than derived from `duration_minutes`, so
a future change to the rate cannot retroactively alter what an old session cost.

### `credit_ledger`
Append-only. `balance = SUM(delta)`. There is no balance column anywhere in the
schema — see [CREDITS.md](CREDITS.md). `balance_after` is denormalised purely
for statement display.

`CHECK (delta <> 0)` rejects no-op rows.

### `ratings`
Two rows per completed session, at most — one per direction.
`UNIQUE (session_id, rater_id)` enforces one rating per person per session, and
`CHECK (rater_id <> ratee_id)` stops self-rating. `tags` is a comma-separated
list drawn from a fixed vocabulary in `src/lib/constants.ts`.

Ratings are not deletable by the person who received them. That's the point.

### `reports`
A report names a reporter, a reported student and optionally a session.
`status` moves `open → reviewing → resolved | dismissed`. The reporter's
identity is stored but never shown to the reported student anywhere in the UI.

### `blocks`
Directional rows, enforced symmetrically. Search, browse and session requests
all check `isBlockedEitherWay`, so one block hides both people from each other.

### `verification_codes`
Stores `sha256(code)`, never the code. Expiry, attempt count and
`consumed_at` live here. Resending supersedes outstanding codes.

### `auth_sessions`
Server-side login sessions keyed on `sha256(cookie token)`. Having these as
rows rather than stateless JWTs is what makes immediate revocation possible —
the thing a moderation tool most needs.

### `admin_audit`
Every moderator action: who, what, which target, why, when. A moderator cannot
quietly adjust a balance — the adjustment is a visible ledger row *and* an
audit row.

### `rate_limits`
Fixed-window counters keyed by action and identity. Single-process only.

### `notifications`
In-app only. No email or push is wired up.

## Indexes

Every foreign key used in a hot path is indexed, plus:

- `idx_user_skills_lookup (skill_id, kind)` — "who teaches X"
- `idx_ledger_user (user_id, created_at DESC)` — balance and statement
- `idx_sessions_learner` / `idx_sessions_teacher` on `(id, status)` — dashboards
- `idx_reports_status (status, created_at DESC)` — the moderation queue

## What isn't modelled

- Messages between students.
- Uploaded files or avatars.
- Anything resembling money, an invoice or a payout.
- Calendar events or conflict detection.
- Soft deletes. A deleted user cascades; there is no self-serve deletion flow.
