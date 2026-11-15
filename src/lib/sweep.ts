import { getDb, nowIso, transact } from "./db";
import { postEntry } from "./credits";

/** A request nobody answered this long after its slot has clearly lapsed. */
const PENDING_GRACE_HOURS = 24;

/** An accepted session neither side ever confirmed. */
const UNCONFIRMED_GRACE_DAYS = 14;

export interface SweepResult {
  expiredRequests: number;
  expiredSessions: number;
  creditsReturned: number;
}

/**
 * Releases credits held by sessions that will never resolve on their own:
 * requests that were never answered, and accepted sessions neither person
 * ever confirmed. Without this, a held credit could sit out of circulation
 * for good.
 *
 * It is idempotent and cheap (two indexed reads), and is called when a signed
 * in student loads their dashboard. On a real deployment, run it from a cron
 * job every hour instead and drop the call site — see docs/ARCHITECTURE.md.
 */
export function settleStaleSessions(): SweepResult {
  const db = getDb();
  const now = Date.now();

  const pendingCutoff = new Date(now - PENDING_GRACE_HOURS * 3_600_000).toISOString();
  const acceptedCutoff = new Date(now - UNCONFIRMED_GRACE_DAYS * 86_400_000).toISOString();

  const stale = db
    .prepare(
      `SELECT id, learner_id, credits, status FROM sessions
        WHERE (status = 'pending'  AND scheduled_at < ?)
           OR (status = 'accepted' AND scheduled_at < ?
               AND learner_confirmed_at IS NULL AND teacher_confirmed_at IS NULL)`
    )
    .all(pendingCutoff, acceptedCutoff) as {
    id: string;
    learner_id: string;
    credits: number;
    status: string;
  }[];

  if (stale.length === 0) {
    return { expiredRequests: 0, expiredSessions: 0, creditsReturned: 0 };
  }

  const result: SweepResult = { expiredRequests: 0, expiredSessions: 0, creditsReturned: 0 };

  transact((tx) => {
    const expire = tx.prepare(
      `UPDATE sessions SET status = 'expired', cancel_reason = ?, updated_at = ?
        WHERE id = ? AND status IN ('pending','accepted')`
    );

    for (const session of stale) {
      const reason =
        session.status === "pending"
          ? "Nobody answered this request before the session time passed."
          : "Neither of you confirmed this session, so the credits went back to the learner.";

      // The guard in the UPDATE makes a concurrent sweep a no-op rather than a
      // double refund.
      const changed = expire.run(reason, nowIso(), session.id).changes;
      if (changed === 0) continue;

      postEntry(tx, {
        userId: session.learner_id,
        delta: session.credits,
        reason: "hold_released",
        sessionId: session.id,
        note: reason,
      });

      result.creditsReturned += session.credits;
      if (session.status === "pending") result.expiredRequests += 1;
      else result.expiredSessions += 1;
    }
  });

  return result;
}
