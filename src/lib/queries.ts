import { getDb } from "./db";
import { scoreMatch } from "./matching";
import type {
  LedgerEntry,
  MatchResult,
  PublicUser,
  Rating,
  Report,
  SessionDetail,
  Skill,
  SkillCategory,
  SkillKind,
  SkillLevel,
  User,
  UserSkillRow,
} from "./types";

/**
 * Every public view of a student goes through this projection, so a password
 * hash or an email address can never leak into a page by accident.
 */
const PUBLIC_USER_SELECT = `
  SELECT u.id, u.handle, u.name, u.school_id, u.year, u.bio, u.avatar_emoji,
         u.verification_status, u.is_suspended, u.created_at,
         sc.name AS school_name,
         (SELECT ROUND(AVG(r.stars), 2) FROM ratings r WHERE r.ratee_id = u.id) AS rating_avg,
         (SELECT COUNT(*) FROM ratings r WHERE r.ratee_id = u.id) AS rating_count,
         (SELECT COUNT(*) FROM sessions s
           WHERE s.teacher_id = u.id AND s.status = 'completed') AS sessions_taught,
         (SELECT COALESCE(SUM(s.duration_minutes), 0) / 60.0 FROM sessions s
           WHERE s.teacher_id = u.id AND s.status = 'completed') AS hours_taught
    FROM users u
    LEFT JOIN schools sc ON sc.id = u.school_id
`;

export function getPublicUserByHandle(handle: string): PublicUser | null {
  const row = getDb()
    .prepare(`${PUBLIC_USER_SELECT} WHERE u.handle = ?`)
    .get(handle) as PublicUser | undefined;
  return row ?? null;
}

export function getPublicUserById(id: string): PublicUser | null {
  const row = getDb()
    .prepare(`${PUBLIC_USER_SELECT} WHERE u.id = ?`)
    .get(id) as PublicUser | undefined;
  return row ?? null;
}

export function getUserByEmail(email: string): User | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email.trim().toLowerCase()) as User | undefined;
  return row ?? null;
}

// ------------------------------------------------------------------- skills
export function listCategories(): SkillCategory[] {
  return getDb()
    .prepare(`SELECT * FROM skill_categories ORDER BY sort_order, name`)
    .all() as SkillCategory[];
}

export interface CategoryWithStats extends SkillCategory {
  skill_count: number;
  teacher_count: number;
  learner_count: number;
  sample_skills: string;
}

export function listCategoriesWithStats(): CategoryWithStats[] {
  return getDb()
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM skills s WHERE s.category_id = c.id) AS skill_count,
              (SELECT COUNT(DISTINCT us.user_id) FROM user_skills us
                 JOIN skills s ON s.id = us.skill_id
                WHERE s.category_id = c.id AND us.kind = 'teach') AS teacher_count,
              (SELECT COUNT(DISTINCT us.user_id) FROM user_skills us
                 JOIN skills s ON s.id = us.skill_id
                WHERE s.category_id = c.id AND us.kind = 'learn') AS learner_count,
              (SELECT GROUP_CONCAT(x.name, ', ') FROM
                 (SELECT s.name FROM skills s WHERE s.category_id = c.id
                   ORDER BY s.name LIMIT 4) x) AS sample_skills
         FROM skill_categories c
        ORDER BY c.sort_order, c.name`
    )
    .all() as CategoryWithStats[];
}

export function listSkills(): (Skill & { category_name: string; category_slug: string })[] {
  return getDb()
    .prepare(
      `SELECT s.*, c.name AS category_name, c.slug AS category_slug
         FROM skills s JOIN skill_categories c ON c.id = s.category_id
        ORDER BY c.sort_order, s.name`
    )
    .all() as (Skill & { category_name: string; category_slug: string })[];
}

export function getUserSkills(userId: string, kind?: SkillKind): UserSkillRow[] {
  const db = getDb();
  const sql = `
    SELECT us.*, s.name AS skill_name, s.slug AS skill_slug,
           c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      JOIN skill_categories c ON c.id = s.category_id
     WHERE us.user_id = ?${kind ? " AND us.kind = ?" : ""}
     ORDER BY c.sort_order, s.name`;
  return (kind ? db.prepare(sql).all(userId, kind) : db.prepare(sql).all(userId)) as UserSkillRow[];
}

function skillIdSet(userId: string | null, kind: SkillKind): Set<string> {
  if (!userId) return new Set();
  const rows = getDb()
    .prepare(`SELECT skill_id FROM user_skills WHERE user_id = ? AND kind = ?`)
    .all(userId, kind) as { skill_id: string }[];
  return new Set(rows.map((r) => r.skill_id));
}

// ------------------------------------------------------------ search / match
export interface SearchParams {
  viewerId: string | null;
  query?: string;
  categorySlug?: string;
  schoolId?: string;
  /** "match" needs a signed-in viewer; falls back to "rating". */
  sort?: "match" | "rating" | "newest" | "active";
  verifiedOnly?: boolean;
  limit?: number;
}

export function searchTeachers(params: SearchParams): MatchResult[] {
  const db = getDb();
  const {
    viewerId,
    query = "",
    categorySlug = "",
    schoolId = "",
    sort = viewerId ? "match" : "rating",
    verifiedOnly = false,
    limit = 48,
  } = params;

  const clauses: string[] = ["u.is_suspended = 0"];
  const args: unknown[] = [];

  // Only students who actually offer something can appear as teachers.
  clauses.push(`EXISTS (SELECT 1 FROM user_skills us WHERE us.user_id = u.id AND us.kind = 'teach')`);

  if (viewerId) {
    clauses.push("u.id <> ?");
    args.push(viewerId);
    // Respect blocks in both directions.
    clauses.push(
      `NOT EXISTS (SELECT 1 FROM blocks b
         WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
            OR (b.blocker_id = u.id AND b.blocked_id = ?))`
    );
    args.push(viewerId, viewerId);
  }

  if (verifiedOnly) clauses.push(`u.verification_status = 'verified'`);

  if (schoolId) {
    clauses.push("u.school_id = ?");
    args.push(schoolId);
  }

  if (categorySlug) {
    clauses.push(
      `EXISTS (SELECT 1 FROM user_skills us
         JOIN skills s ON s.id = us.skill_id
         JOIN skill_categories c ON c.id = s.category_id
        WHERE us.user_id = u.id AND us.kind = 'teach' AND c.slug = ?)`
    );
    args.push(categorySlug);
  }

  const trimmed = query.trim();
  if (trimmed) {
    const like = `%${trimmed.toLowerCase()}%`;
    clauses.push(
      `(LOWER(u.name) LIKE ?
        OR LOWER(u.bio) LIKE ?
        OR EXISTS (SELECT 1 FROM user_skills us
             JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id = u.id AND us.kind = 'teach' AND LOWER(s.name) LIKE ?))`
    );
    args.push(like, like, like);
  }

  const candidates = db
    .prepare(`${PUBLIC_USER_SELECT} WHERE ${clauses.join(" AND ")} LIMIT 400`)
    .all(...args) as PublicUser[];

  const viewerWants = skillIdSet(viewerId, "learn");
  const viewerTeaches = skillIdSet(viewerId, "teach");
  const viewer = viewerId ? getPublicUserById(viewerId) : null;

  const teachStmt = db.prepare(
    `SELECT us.skill_id, s.name, s.slug, us.level, c.icon AS category_icon
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       JOIN skill_categories c ON c.id = s.category_id
      WHERE us.user_id = ? AND us.kind = 'teach'
      ORDER BY s.name`
  );
  const wantStmt = db.prepare(
    `SELECT us.skill_id, s.name, s.slug
       FROM user_skills us JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ? AND us.kind = 'learn'
      ORDER BY s.name`
  );

  const results: MatchResult[] = candidates.map((candidate) => {
    const teaches = teachStmt.all(candidate.id) as {
      skill_id: string;
      name: string;
      slug: string;
      level: SkillLevel;
      category_icon: string;
    }[];
    const wants = wantStmt.all(candidate.id) as { skill_id: string; name: string; slug: string }[];

    const scored = scoreMatch({
      candidate,
      candidateTeaches: teaches,
      candidateWants: wants,
      viewerWants,
      viewerTeaches,
      viewerSchoolId: viewer?.school_id ?? null,
      candidateSchoolId: candidate.school_id,
    });

    return {
      user: candidate,
      teaches: teaches.map(({ name, slug, level, category_icon }) => ({
        name,
        slug,
        level,
        category_icon,
      })),
      wants: wants.map(({ name, slug }) => ({ name, slug })),
      score: scored.score,
      reasons: scored.reasons,
      mutual: scored.mutual,
    };
  });

  const sorters: Record<string, (a: MatchResult, b: MatchResult) => number> = {
    match: (a, b) => b.score - a.score,
    rating: (a, b) =>
      (b.user.rating_avg ?? 0) - (a.user.rating_avg ?? 0) ||
      b.user.rating_count - a.user.rating_count,
    newest: (a, b) => b.user.created_at.localeCompare(a.user.created_at),
    active: (a, b) => b.user.sessions_taught - a.user.sessions_taught,
  };

  return results.sort(sorters[sort] ?? sorters.match).slice(0, limit);
}

// ----------------------------------------------------------------- sessions
const SESSION_SELECT = `
  SELECT s.*, sk.name AS skill_name, sk.slug AS skill_slug,
         l.name AS learner_name, l.handle AS learner_handle, l.avatar_emoji AS learner_avatar,
         t.name AS teacher_name, t.handle AS teacher_handle, t.avatar_emoji AS teacher_avatar
    FROM sessions s
    JOIN skills sk ON sk.id = s.skill_id
    JOIN users l ON l.id = s.learner_id
    JOIN users t ON t.id = s.teacher_id
`;

export function getSessionById(id: string): SessionDetail | null {
  const row = getDb().prepare(`${SESSION_SELECT} WHERE s.id = ?`).get(id) as
    | SessionDetail
    | undefined;
  return row ?? null;
}

export function getIncomingRequests(userId: string): SessionDetail[] {
  return getDb()
    .prepare(`${SESSION_SELECT} WHERE s.teacher_id = ? AND s.status = 'pending'
              ORDER BY s.scheduled_at`)
    .all(userId) as SessionDetail[];
}

export function getOutgoingRequests(userId: string): SessionDetail[] {
  return getDb()
    .prepare(`${SESSION_SELECT} WHERE s.learner_id = ? AND s.status = 'pending'
              ORDER BY s.scheduled_at`)
    .all(userId) as SessionDetail[];
}

export function getUpcomingSessions(userId: string): SessionDetail[] {
  return getDb()
    .prepare(
      `${SESSION_SELECT}
        WHERE (s.learner_id = ? OR s.teacher_id = ?) AND s.status = 'accepted'
        ORDER BY s.scheduled_at`
    )
    .all(userId, userId) as SessionDetail[];
}

export function getPastSessions(userId: string, limit = 40): SessionDetail[] {
  return getDb()
    .prepare(
      `${SESSION_SELECT}
        WHERE (s.learner_id = ? OR s.teacher_id = ?)
          AND s.status IN ('completed','declined','cancelled','expired','disputed')
        ORDER BY COALESCE(s.completed_at, s.updated_at) DESC LIMIT ?`
    )
    .all(userId, userId, limit) as SessionDetail[];
}

/** Sessions the given user still owes a rating for. */
export function getUnratedSessions(userId: string): SessionDetail[] {
  return getDb()
    .prepare(
      `${SESSION_SELECT}
        WHERE (s.learner_id = ? OR s.teacher_id = ?)
          AND s.status = 'completed'
          AND NOT EXISTS (SELECT 1 FROM ratings r
                           WHERE r.session_id = s.id AND r.rater_id = ?)
        ORDER BY s.completed_at DESC`
    )
    .all(userId, userId, userId) as SessionDetail[];
}

export function hasCompletedSessionTogether(a: string, b: string): boolean {
  return Boolean(
    getDb()
      .prepare(
        `SELECT 1 FROM sessions
          WHERE status = 'completed'
            AND ((learner_id = ? AND teacher_id = ?) OR (learner_id = ? AND teacher_id = ?))
          LIMIT 1`
      )
      .get(a, b, b, a)
  );
}

export function pendingBetween(learnerId: string, teacherId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM sessions
        WHERE learner_id = ? AND teacher_id = ? AND status IN ('pending','accepted')`
    )
    .get(learnerId, teacherId) as { n: number };
  return row.n;
}

// ------------------------------------------------------------------ ratings
export function getRatingsForUser(userId: string, limit = 20): Rating[] {
  return getDb()
    .prepare(
      `SELECT r.*, u.name AS rater_name, u.handle AS rater_handle,
              u.avatar_emoji AS rater_avatar, sk.name AS skill_name
         FROM ratings r
         JOIN users u ON u.id = r.rater_id
         LEFT JOIN sessions s ON s.id = r.session_id
         LEFT JOIN skills sk ON sk.id = s.skill_id
        WHERE r.ratee_id = ?
        ORDER BY r.created_at DESC LIMIT ?`
    )
    .all(userId, limit) as Rating[];
}

export function ratingTagCounts(userId: string): { tag: string; count: number }[] {
  const rows = getDb()
    .prepare(`SELECT tags FROM ratings WHERE ratee_id = ? AND tags <> ''`)
    .all(userId) as { tags: string }[];
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tags.split(",").map((t) => t.trim()).filter(Boolean)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

// ----------------------------------------------------------------- blocking
export function isBlockedEitherWay(a: string, b: string): boolean {
  return Boolean(
    getDb()
      .prepare(
        `SELECT 1 FROM blocks
          WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
          LIMIT 1`
      )
      .get(a, b, b, a)
  );
}

// -------------------------------------------------------------------- admin
export function listReports(status?: string): Report[] {
  const db = getDb();
  const sql = `
    SELECT r.*, rep.name AS reporter_name,
           tgt.name AS reported_name, tgt.handle AS reported_handle
      FROM reports r
      JOIN users rep ON rep.id = r.reporter_id
      JOIN users tgt ON tgt.id = r.reported_user_id
     ${status ? "WHERE r.status = ?" : ""}
     ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,
              r.created_at DESC`;
  return (status ? db.prepare(sql).all(status) : db.prepare(sql).all()) as Report[];
}

export function listPendingVerification(): PublicUser[] {
  return getDb()
    .prepare(`${PUBLIC_USER_SELECT} WHERE u.verification_status IN ('unverified','pending')
              ORDER BY u.created_at DESC LIMIT 50`)
    .all() as PublicUser[];
}

export function listSuspended(): PublicUser[] {
  return getDb()
    .prepare(`${PUBLIC_USER_SELECT} WHERE u.is_suspended = 1 ORDER BY u.updated_at DESC`)
    .all() as PublicUser[];
}

export function recentAudit(limit = 25): {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
  created_at: string;
  admin_name: string;
}[] {
  return getDb()
    .prepare(
      `SELECT a.*, u.name AS admin_name FROM admin_audit a
         JOIN users u ON u.id = a.admin_id
        ORDER BY a.created_at DESC LIMIT ?`
    )
    .all(limit) as never;
}

// -------------------------------------------------------- community numbers
export interface CommunityStats {
  students: number;
  verified: number;
  skills_offered: number;
  sessions_completed: number;
  hours_exchanged: number;
  credits_circulating: number;
  schools: number;
  avg_rating: number | null;
}

export function communityStats(): CommunityStats {
  const db = getDb();
  const one = <T>(sql: string): T => db.prepare(sql).get() as T;

  const { students } = one<{ students: number }>(
    `SELECT COUNT(*) AS students FROM users WHERE is_suspended = 0`
  );
  const { verified } = one<{ verified: number }>(
    `SELECT COUNT(*) AS verified FROM users WHERE verification_status = 'verified'`
  );
  const { skills_offered } = one<{ skills_offered: number }>(
    `SELECT COUNT(DISTINCT skill_id) AS skills_offered FROM user_skills WHERE kind = 'teach'`
  );
  const { sessions_completed, minutes } = one<{ sessions_completed: number; minutes: number }>(
    `SELECT COUNT(*) AS sessions_completed,
            COALESCE(SUM(duration_minutes), 0) AS minutes
       FROM sessions WHERE status = 'completed'`
  );
  const { credits_circulating } = one<{ credits_circulating: number }>(
    `SELECT COALESCE(SUM(delta), 0) AS credits_circulating FROM credit_ledger`
  );
  const { schools } = one<{ schools: number }>(`SELECT COUNT(*) AS schools FROM schools`);
  const { avg_rating } = one<{ avg_rating: number | null }>(
    `SELECT ROUND(AVG(stars), 2) AS avg_rating FROM ratings`
  );

  return {
    students,
    verified,
    skills_offered,
    sessions_completed,
    hours_exchanged: Math.round((minutes / 60) * 10) / 10,
    credits_circulating,
    schools,
    avg_rating,
  };
}

export function listSchools(): { id: string; name: string; slug: string }[] {
  return getDb()
    .prepare(`SELECT id, name, slug FROM schools ORDER BY name`)
    .all() as { id: string; name: string; slug: string }[];
}

export function getLedger(userId: string, limit = 60): LedgerEntry[] {
  return getDb()
    .prepare(
      `SELECT * FROM credit_ledger WHERE user_id = ?
        ORDER BY created_at DESC, rowid DESC LIMIT ?`
    )
    .all(userId, limit) as LedgerEntry[];
}

export function unreadNotificationCount(userId: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`)
    .get(userId) as { n: number };
  return row.n;
}

export function listNotifications(userId: string, limit = 20) {
  return getDb()
    .prepare(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, limit) as {
    id: string;
    kind: string;
    title: string;
    body: string;
    href: string;
    read_at: string | null;
    created_at: string;
  }[];
}

export interface AvailabilityBlock {
  weekday: number;
  start_minute: number;
  end_minute: number;
}

export function getAvailability(userId: string): AvailabilityBlock[] {
  return getDb()
    .prepare(
      `SELECT weekday, start_minute, end_minute FROM availability
        WHERE user_id = ? ORDER BY weekday, start_minute`
    )
    .all(userId) as AvailabilityBlock[];
}

export function listBlockedUsers(userId: string): { id: string; name: string; handle: string }[] {
  return getDb()
    .prepare(
      `SELECT u.id, u.name, u.handle FROM blocks b
         JOIN users u ON u.id = b.blocked_id
        WHERE b.blocker_id = ? ORDER BY u.name`
    )
    .all(userId) as { id: string; name: string; handle: string }[];
}
