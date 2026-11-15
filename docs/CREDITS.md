# The credit system

> One credit is **30 minutes** of another student's time.

That is the entire unit of account. Everything else is bookkeeping around it.

## The rate

| Session length | Credits |
| --- | --- |
| 30 minutes | 1 |
| 1 hour | 2 |
| 1 hour 30 | 3 |
| 2 hours | 4 |

The rate does not vary by subject, seniority or demand. A first-year teaching
Spanish conversation and a PhD student teaching organic chemistry both earn two
credits an hour.

This is the most-questioned design decision in the project, so the reasoning is
worth writing down. Pricing time by expertise would:

- rebuild a money economy with extra steps, and with it the thing SkillSwap
  exists to avoid — students priced out of help they need;
- require someone to decide what each skill is worth, which is an endless and
  political argument;
- punish exactly the first-years whose participation keeps the pool liquid.

The cost is real: SkillSwap cannot signal that one teacher is more valuable
than another through price. It signals it through ratings instead.

## Starting balance

A student receives **2 credits** (`SIGNUP_BONUS_CREDITS`) the moment they
verify their school email — not at registration. One hour of learning before
they have taught anyone anything.

It is a grant from the community, not a loan. There is nothing to pay back, and
a balance can never be driven negative by ordinary use.

## The ledger

`credit_ledger` is **append-only**. There is no balance column anywhere in the
schema.

```sql
balance(user) = SELECT COALESCE(SUM(delta), 0) FROM credit_ledger WHERE user_id = ?
```

Every row carries a `reason`, an optional `session_id`, a human-readable `note`
and `balance_after` (denormalised purely so the wallet can print a statement
without recomputing a running total in the UI).

| Reason | Sign | When |
| --- | --- | --- |
| `signup_bonus` | + | Once, on verifying a school email |
| `session_hold` | − | A session request is sent |
| `hold_released` | + | The request was declined, cancelled or expired |
| `session_earned` | + | Both people confirmed — the teacher is paid |
| `no_show_refund` | + | Reserved for moderator refunds |
| `admin_adjustment` | ± | A moderator correction, with a mandatory reason |
| `community_grant` | + | Seed data and future community grants |

## The two rules that make it trustworthy

**1. Credits are held when the request is sent, not when it is accepted.**

If credits were only debited on acceptance, a learner with two credits could
send five requests and over-commit four of them. Holding at request time means
the balance you see is the balance you can actually spend.

A held credit has already left the learner's balance. `heldCreditsOf()` exists
only so the wallet can explain where it went.

**2. Credits transfer only when both people confirm.**

`confirmSessionAction` records one side's confirmation. The `session_earned`
entry is written only when the *second* person confirms. Neither party can move
credits on their own say-so, which is what makes fake sessions and credit
farming between two accounts unprofitable.

## Invariants

- No balance goes below zero through ordinary use. `postEntry` reads the
  current balance inside the transaction and throws `InsufficientCredits`
  rather than writing a row that would breach it.
- Moderator corrections pass `allowNegative: true`, because a reversal must
  always be possible. This is the only path to a negative balance.
- Every write happens inside `transact()`, which opens an *immediate*
  transaction so the balance read and the insert cannot interleave with
  another writer.
- Total credits in circulation (`SUM(delta)` across all rows) dips while
  credits are held and returns when a session completes or is released.

## Sessions that never resolve

A request nobody answers, or an accepted session neither person confirms,
would otherwise hold credits forever. `src/lib/sweep.ts` releases them:

- `pending` more than 24 hours past its scheduled time → `expired`, hold released
- `accepted` more than 14 days past, with no confirmation from either side →
  `expired`, hold released to the learner. The teacher is **not** paid, because
  nobody said it happened.

The sweep is idempotent — the status guard is inside the `UPDATE`, so a
concurrent run is a no-op rather than a double refund. Run it hourly
(`npm run sweep`) in a real deployment.

## What credits are not

Credits have no cash value. They cannot be bought, sold, gifted, transferred
between accounts, or cashed out, and there is no code path that would allow it.
The only way a credit moves is a completed session that both people confirmed.
