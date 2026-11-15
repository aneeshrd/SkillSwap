import { getDb, nowIso } from "./db";

/**
 * Fixed-window counter in SQLite. Good enough to blunt credential stuffing and
 * request spam on a single-node pilot; swap for Redis if you run more than one
 * instance.
 */
export function rateLimit(key: string, limit: number, windowSeconds: number): { ok: boolean; retryAfter: number } {
  const db = getDb();
  const now = new Date();
  const row = db.prepare(`SELECT window_start, count FROM rate_limits WHERE key = ?`).get(key) as
    | { window_start: string; count: number }
    | undefined;

  const windowMs = windowSeconds * 1000;

  if (!row || now.getTime() - new Date(row.window_start).getTime() > windowMs) {
    db.prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1`
    ).run(key, nowIso());
    return { ok: true, retryAfter: 0 };
  }

  if (row.count >= limit) {
    const elapsed = now.getTime() - new Date(row.window_start).getTime();
    return { ok: false, retryAfter: Math.ceil((windowMs - elapsed) / 1000) };
  }

  db.prepare(`UPDATE rate_limits SET count = count + 1 WHERE key = ?`).run(key);
  return { ok: true, retryAfter: 0 };
}
