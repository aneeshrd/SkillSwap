-- ---------------------------------------------------------------------------
-- SkillSwap schema
--
-- Conventions:
--   * ids are text (crypto.randomUUID)
--   * timestamps are ISO-8601 UTC strings, e.g. 2026-03-14T18:05:00.000Z
--   * booleans are INTEGER 0/1
--   * a "credit" is 30 minutes of someone's time. See docs/CREDITS.md.
-- ---------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------------- schools
CREATE TABLE IF NOT EXISTS schools (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  email_domains TEXT NOT NULL,            -- comma separated, lowercase
  city          TEXT,
  region        TEXT,
  created_at    TEXT NOT NULL
);

-- ----------------------------------------------------------------- categories
CREATE TABLE IF NOT EXISTS skill_categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  blurb      TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '*',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- --------------------------------------------------------------------- skills
CREATE TABLE IF NOT EXISTS skills (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL REFERENCES skill_categories(id) ON DELETE RESTRICT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category_id);

-- ---------------------------------------------------------------------- users
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  handle              TEXT NOT NULL UNIQUE,     -- url slug, e.g. "maya-r"
  name                TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,     -- stored lowercase
  email_domain        TEXT NOT NULL,
  password_hash       TEXT NOT NULL,            -- scrypt: N:r:p:salt:key (hex)
  school_id           TEXT REFERENCES schools(id) ON DELETE SET NULL,
  year                TEXT,                     -- "First year" ... "Graduate"
  bio                 TEXT NOT NULL DEFAULT '',
  avatar_emoji        TEXT NOT NULL DEFAULT 'SS',
  verification_status TEXT NOT NULL DEFAULT 'unverified'
                      CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  verified_at         TEXT,
  is_admin            INTEGER NOT NULL DEFAULT 0,
  is_suspended        INTEGER NOT NULL DEFAULT 0,
  suspension_reason   TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(verification_status);

-- --------------------------------------------------------------- user_skills
-- One row per (student, skill, direction). `kind` = what they offer vs want.
CREATE TABLE IF NOT EXISTS user_skills (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id   TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('teach','learn')),
  level      TEXT NOT NULL DEFAULT 'intermediate'
             CHECK (level IN ('beginner','intermediate','advanced')),
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (user_id, skill_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_user_skills_lookup ON user_skills(skill_id, kind);
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id, kind);

-- -------------------------------------------------------------- availability
CREATE TABLE IF NOT EXISTS availability (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday      INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0 = Sunday
  start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1440),
  end_minute   INTEGER NOT NULL CHECK (end_minute BETWEEN 0 AND 1440),
  CHECK (end_minute > start_minute)
);
CREATE INDEX IF NOT EXISTS idx_availability_user ON availability(user_id);

-- ------------------------------------------------------------------ sessions
-- A session row IS the request. Status carries it through its whole life.
CREATE TABLE IF NOT EXISTS sessions (
  id                   TEXT PRIMARY KEY,
  learner_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id             TEXT NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','accepted','declined','cancelled',
                                         'completed','disputed','expired')),
  duration_minutes     INTEGER NOT NULL CHECK (duration_minutes IN (30,60,90,120)),
  credits              INTEGER NOT NULL CHECK (credits > 0),
  scheduled_at         TEXT NOT NULL,
  mode                 TEXT NOT NULL CHECK (mode IN ('in_person','video')),
  location             TEXT NOT NULL DEFAULT '',   -- public campus place, or a link
  learner_message      TEXT NOT NULL DEFAULT '',
  teacher_note         TEXT NOT NULL DEFAULT '',
  learner_confirmed_at TEXT,
  teacher_confirmed_at TEXT,
  completed_at         TEXT,
  cancelled_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  cancel_reason        TEXT NOT NULL DEFAULT '',
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  CHECK (learner_id <> teacher_id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_learner ON sessions(learner_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON sessions(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_sched ON sessions(scheduled_at);

-- ------------------------------------------------------------- credit_ledger
-- Append-only. A student's balance is SUM(delta). Nothing mutates a balance
-- column, so every credit in the system is traceable to a row.
CREATE TABLE IF NOT EXISTS credit_ledger (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta         INTEGER NOT NULL CHECK (delta <> 0),
  reason        TEXT NOT NULL CHECK (reason IN (
                  'signup_bonus','session_hold','hold_released','session_earned',
                  'no_show_refund','admin_adjustment','community_grant')),
  session_id    TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  balance_after INTEGER NOT NULL,
  note          TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON credit_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_session ON credit_ledger(session_id);

-- ------------------------------------------------------------------- ratings
CREATE TABLE IF NOT EXISTS ratings (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rater_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ratee_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars      INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment    TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '',   -- comma separated, e.g. "patient,prepared"
  created_at TEXT NOT NULL,
  UNIQUE (session_id, rater_id),
  CHECK (rater_id <> ratee_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_ratee ON ratings(ratee_id);

-- ------------------------------------------------------------------- reports
CREATE TABLE IF NOT EXISTS reports (
  id               TEXT PRIMARY KEY,
  reporter_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id       TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  category         TEXT NOT NULL CHECK (category IN (
                     'no_show','inappropriate_behaviour','harassment',
                     'misrepresented_skill','safety_concern','spam','other')),
  details          TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','reviewing','resolved','dismissed')),
  resolution_note  TEXT NOT NULL DEFAULT '',
  handled_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  handled_at       TEXT,
  created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);

-- -------------------------------------------------------------------- blocks
CREATE TABLE IF NOT EXISTS blocks (
  id         TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- -------------------------------------------------------- verification_codes
CREATE TABLE IF NOT EXISTS verification_codes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,          -- sha256, never the plaintext code
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vcodes_user ON verification_codes(user_id, created_at DESC);

-- ------------------------------------------------------------- auth_sessions
-- Server-side so an admin suspending an account kills its live logins.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id         TEXT PRIMARY KEY,        -- sha256 of the cookie token
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

-- --------------------------------------------------------------- admin_audit
CREATE TABLE IF NOT EXISTS admin_audit (
  id          TEXT PRIMARY KEY,
  admin_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit(created_at DESC);

-- --------------------------------------------------------------- rate_limits
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  href       TEXT NOT NULL DEFAULT '',
  read_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
