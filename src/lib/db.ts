import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let instance: Database.Database | null = null;

function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim() || "data/skillswap.db";
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

function applySchema(db: Database.Database): void {
  const dir = path.join(process.cwd(), "src", "lib");
  // Both files are idempotent: CREATE ... IF NOT EXISTS, INSERT OR IGNORE.
  // Running them on every connection means a fresh deployment comes up with
  // its tables and a usable skill catalogue, with no migration step.
  db.exec(fs.readFileSync(path.join(dir, "schema.sql"), "utf8"));
  db.exec(fs.readFileSync(path.join(dir, "taxonomy.sql"), "utf8"));
}

/**
 * Single shared connection. better-sqlite3 is synchronous, so one connection
 * per process is both correct and fastest; WAL lets readers run while a
 * writer holds the lock.
 */
export function getDb(): Database.Database {
  if (instance) return instance;

  const file = resolveDatabasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  applySchema(db);

  instance = db;
  return db;
}

/** Run `fn` inside a single immediate transaction. */
export function transact<T>(fn: (db: Database.Database) => T): T {
  const db = getDb();
  const wrapped = db.transaction(fn as (db: Database.Database) => unknown);
  return wrapped.immediate(db) as T;
}

export const nowIso = (): string => new Date().toISOString();
export const newId = (): string => crypto.randomUUID();
