import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * The one secret the app signs things with: session cookies and call tickets.
 *
 * In production it must be supplied. In development, requiring it meant a
 * fresh clone could render every page but fail the moment someone signed up —
 * and the failure surfaced as a confusing Next.js error rather than the real
 * one. So locally we generate a secret once and keep it in `data/`, which is
 * gitignored. It survives restarts, so existing dev logins keep working.
 */

const DEV_SECRET_FILE = "data/.dev-session-secret";
let cached: string | null = null;

function developmentSecret(): string {
  if (cached) return cached;

  const file = path.join(process.cwd(), DEV_SECRET_FILE);
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing.length >= 32) {
      cached = existing;
      return cached;
    }
  } catch {
    /* first run */
  }

  const generated = crypto.randomBytes(32).toString("hex");
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${generated}\n`, { mode: 0o600 });
    console.warn(
      `\n  SESSION_SECRET was not set, so a development one was generated and saved to ${DEV_SECRET_FILE}.` +
        `\n  That is fine locally. A production deployment must set SESSION_SECRET itself.\n`
    );
  } catch {
    // Read-only filesystem: still usable, but logins won't survive a restart.
    console.warn("SESSION_SECRET is not set and could not be cached; logins will drop on restart.");
  }

  cached = generated;
  return cached;
}

export function appSecret(): string {
  const supplied = process.env.SESSION_SECRET?.trim();
  if (supplied && supplied.length >= 16) return supplied;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set it before starting in production — " +
        'generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return developmentSecret();
}

/** Called at boot so a misconfigured production deploy fails immediately. */
export function assertSecretConfigured(): void {
  appSecret();
}
