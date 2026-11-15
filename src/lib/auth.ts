import crypto from "node:crypto";
import { getDb, newId, nowIso } from "./db";
import type { User } from "./types";

// ---------------------------------------------------------------- passwords
// scrypt from node:crypto — no native dependency, no third-party crypto.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  });
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("hex"),
    key.toString("hex"),
  ].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltHex, keyHex] = parts;
  try {
    const expected = Buffer.from(keyHex, "hex");
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, {
      N: Number(nStr),
      r: Number(rStr),
      p: Number(pStr),
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ------------------------------------------------------------ school emails
export function allowedEmailDomains(): string[] {
  const raw = process.env.ALLOWED_EMAIL_DOMAINS ?? "";
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

/**
 * A school-email check, not an identity check. It stops the open internet
 * from signing up; it does not prove who someone is. See docs/SAFETY.md.
 */
export function isAllowedSchoolEmail(email: string): boolean {
  const domains = allowedEmailDomains();
  if (domains.length === 0) return true; // unconfigured: don't lock anyone out
  const domain = emailDomain(email);
  return domains.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function isAdminEmail(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

// -------------------------------------------------------------- login state
const COOKIE_NAME = "skillswap_session";
const SESSION_DAYS = 30;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    // Fail loudly rather than silently signing with a predictable key.
    throw new Error(
      "SESSION_SECRET is missing or too short. Copy .env.example to .env.local and set it."
    );
  }
  return secret;
}

const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

function sign(token: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

/** Creates a server-side session row and returns the cookie value to set. */
export function issueSessionCookie(userId: string): { name: string; value: string; maxAge: number } {
  const token = crypto.randomBytes(32).toString("hex");
  const db = getDb();
  const created = new Date();
  const expires = new Date(created.getTime() + SESSION_DAYS * 86_400_000);

  db.prepare(
    `INSERT INTO auth_sessions (id, user_id, created_at, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(sha256(token), userId, created.toISOString(), expires.toISOString());

  return {
    name: COOKIE_NAME,
    value: `${token}.${sign(token)}`,
    maxAge: SESSION_DAYS * 86_400,
  };
}

/**
 * Resolves a cookie to a live user. Returns null for a tampered cookie, an
 * expired or revoked session, or a suspended account — so suspending someone
 * logs them out everywhere on their next request.
 */
export function userFromCookieValue(cookieValue: string | undefined): User | null {
  if (!cookieValue) return null;
  const [token, signature] = cookieValue.split(".");
  if (!token || !signature) return null;

  // Reject forged cookies without touching the database.
  const expected = Buffer.from(sign(token), "hex");
  const provided = Buffer.from(signature, "hex");
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null;
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.* FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
          AND s.revoked_at IS NULL
          AND s.expires_at > ?
          AND u.is_suspended = 0`
    )
    .get(sha256(token), nowIso()) as User | undefined;

  return row ?? null;
}

export function revokeSessionCookie(cookieValue: string | undefined): void {
  if (!cookieValue) return;
  const [token] = cookieValue.split(".");
  if (!token) return;
  getDb()
    .prepare(`UPDATE auth_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`)
    .run(nowIso(), sha256(token));
}

export function revokeAllSessionsFor(userId: string): void {
  getDb()
    .prepare(`UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`)
    .run(nowIso(), userId);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

// ------------------------------------------------------- verification codes
const CODE_TTL_MINUTES = 20;
const MAX_CODE_ATTEMPTS = 6;

/** Creates a 6-digit code, stores only its hash, and returns the plaintext. */
export function createVerificationCode(userId: string): string {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const db = getDb();
  const now = new Date();

  // Supersede any outstanding codes for this user.
  db.prepare(
    `UPDATE verification_codes SET consumed_at = ?
      WHERE user_id = ? AND consumed_at IS NULL`
  ).run(now.toISOString(), userId);

  db.prepare(
    `INSERT INTO verification_codes (id, user_id, code_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    newId(),
    userId,
    sha256(code),
    new Date(now.getTime() + CODE_TTL_MINUTES * 60_000).toISOString(),
    now.toISOString()
  );

  return code;
}

export type VerifyOutcome =
  | { ok: true }
  | { ok: false; error: "no_code" | "expired" | "too_many_attempts" | "mismatch" };

export function consumeVerificationCode(userId: string, code: string): VerifyOutcome {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM verification_codes
        WHERE user_id = ? AND consumed_at IS NULL
        ORDER BY created_at DESC LIMIT 1`
    )
    .get(userId) as
    | { id: string; code_hash: string; expires_at: string; attempts: number }
    | undefined;

  if (!row) return { ok: false, error: "no_code" };
  if (row.expires_at <= nowIso()) return { ok: false, error: "expired" };
  if (row.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, error: "too_many_attempts" };

  const supplied = Buffer.from(sha256(code.trim()), "hex");
  const expected = Buffer.from(row.code_hash, "hex");
  const matches =
    supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);

  if (!matches) {
    db.prepare(`UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?`).run(row.id);
    return { ok: false, error: "mismatch" };
  }

  const now = nowIso();
  db.prepare(`UPDATE verification_codes SET consumed_at = ? WHERE id = ?`).run(now, row.id);
  db.prepare(
    `UPDATE users SET verification_status = 'verified', verified_at = ?, updated_at = ?
      WHERE id = ?`
  ).run(now, now, userId);

  return { ok: true };
}

// ---------------------------------------------------------------- handles
export function slugifyHandle(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return base || "student";
}

/** Returns a handle that isn't taken yet. */
export function uniqueHandle(name: string): string {
  const db = getDb();
  const base = slugifyHandle(name);
  const taken = db.prepare(`SELECT 1 FROM users WHERE handle = ?`);
  if (!taken.get(base)) return base;
  for (let i = 2; i < 500; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.get(candidate)) return candidate;
  }
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}
