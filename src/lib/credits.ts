import type Database from "better-sqlite3";
import { getDb, newId, nowIso, transact } from "./db";
import type { LedgerEntry, LedgerReason } from "./types";

/** The unit of account. One credit buys 30 minutes of another student's time. */
export const MINUTES_PER_CREDIT = 30;

/** What a newly verified student starts with, so they can learn before teaching. */
export const SIGNUP_BONUS_CREDITS = 2;

/** Ceiling on how much a single student can owe the community. */
export const MIN_BALANCE = 0;

export const ALLOWED_DURATIONS = [30, 60, 90, 120] as const;
export type AllowedDuration = (typeof ALLOWED_DURATIONS)[number];

export function creditsForMinutes(minutes: number): number {
  return Math.max(1, Math.round(minutes / MINUTES_PER_CREDIT));
}

export function formatCredits(credits: number): string {
  const hours = (credits * MINUTES_PER_CREDIT) / 60;
  const label = credits === 1 ? "credit" : "credits";
  const time = hours === 1 ? "1 hour" : hours < 1 ? `${credits * MINUTES_PER_CREDIT} min` : `${hours} hours`;
  return `${credits} ${label} (${time})`;
}

export class InsufficientCredits extends Error {
  constructor(public readonly balance: number, public readonly needed: number) {
    super(`Not enough credits: balance ${balance}, needed ${needed}`);
    this.name = "InsufficientCredits";
  }
}

/** Balance is derived, never stored. The ledger is the only truth. */
export function balanceOf(userId: string, db: Database.Database = getDb()): number {
  const row = db
    .prepare(`SELECT COALESCE(SUM(delta), 0) AS balance FROM credit_ledger WHERE user_id = ?`)
    .get(userId) as { balance: number };
  return row.balance;
}

/**
 * Credits committed to sessions that haven't happened yet. These are already
 * debited from the balance (held at request time) — this figure exists so the
 * wallet can explain where they went.
 */
export function heldCreditsOf(userId: string, db: Database.Database = getDb()): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(credits), 0) AS held FROM sessions
        WHERE learner_id = ? AND status IN ('pending','accepted')`
    )
    .get(userId) as { held: number };
  return row.held;
}

export function lifetimeEarnedOf(userId: string, db: Database.Database = getDb()): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(delta), 0) AS earned FROM credit_ledger
        WHERE user_id = ? AND delta > 0 AND reason = 'session_earned'`
    )
    .get(userId) as { earned: number };
  return row.earned;
}

export function ledgerFor(userId: string, limit = 50): LedgerEntry[] {
  return getDb()
    .prepare(
      `SELECT * FROM credit_ledger WHERE user_id = ?
        ORDER BY created_at DESC, rowid DESC LIMIT ?`
    )
    .all(userId, limit) as LedgerEntry[];
}

export interface PostEntryInput {
  userId: string;
  delta: number;
  reason: LedgerReason;
  sessionId?: string | null;
  note?: string;
  /** Set for refunds and admin corrections, which are allowed to go below 0. */
  allowNegative?: boolean;
}

/**
 * Appends one ledger row. MUST run inside a transaction (see `transact`) so
 * the balance read and the insert cannot interleave with another writer.
 */
export function postEntry(db: Database.Database, input: PostEntryInput): LedgerEntry {
  const { userId, delta, reason, sessionId = null, note = "", allowNegative = false } = input;
  if (delta === 0) throw new Error("Ledger entries cannot be zero");

  const current = balanceOf(userId, db);
  const next = current + delta;
  if (next < MIN_BALANCE && !allowNegative) {
    throw new InsufficientCredits(current, Math.abs(delta));
  }

  const entry: LedgerEntry = {
    id: newId(),
    user_id: userId,
    delta,
    reason,
    session_id: sessionId,
    balance_after: next,
    note,
    created_at: nowIso(),
  };

  db.prepare(
    `INSERT INTO credit_ledger
       (id, user_id, delta, reason, session_id, balance_after, note, created_at)
     VALUES (@id, @user_id, @delta, @reason, @session_id, @balance_after, @note, @created_at)`
  ).run(entry);

  return entry;
}

/** Grants the starting balance exactly once per student. */
export function grantSignupBonus(userId: string): void {
  transact((db) => {
    const already = db
      .prepare(`SELECT 1 FROM credit_ledger WHERE user_id = ? AND reason = 'signup_bonus'`)
      .get(userId);
    if (already) return;
    postEntry(db, {
      userId,
      delta: SIGNUP_BONUS_CREDITS,
      reason: "signup_bonus",
      note: "Welcome to SkillSwap — your first hour is on the community.",
    });
  });
}

export const LEDGER_LABELS: Record<LedgerReason, string> = {
  signup_bonus: "Welcome credits",
  session_hold: "Held for a session request",
  hold_released: "Released back to you",
  session_earned: "Earned by teaching",
  no_show_refund: "Refunded — no-show",
  admin_adjustment: "Adjusted by a moderator",
  community_grant: "Community grant",
};
