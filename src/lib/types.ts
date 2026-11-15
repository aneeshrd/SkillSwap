// Row shapes mirror src/lib/schema.sql. Kept hand-written (rather than
// generated) so the contract between SQL and TypeScript is reviewable.

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type SkillKind = "teach" | "learn";
export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type SessionMode = "in_person" | "video";
export type SessionStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed"
  | "disputed"
  | "expired";

export type LedgerReason =
  | "signup_bonus"
  | "session_hold"
  | "hold_released"
  | "session_earned"
  | "no_show_refund"
  | "admin_adjustment"
  | "community_grant";

export type ReportCategory =
  | "no_show"
  | "inappropriate_behaviour"
  | "harassment"
  | "misrepresented_skill"
  | "safety_concern"
  | "spam"
  | "other";

export interface School {
  id: string;
  name: string;
  slug: string;
  email_domains: string;
  city: string | null;
  region: string | null;
  created_at: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  slug: string;
  blurb: string;
  icon: string;
  sort_order: number;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  created_at: string;
}

export interface User {
  id: string;
  handle: string;
  name: string;
  email: string;
  email_domain: string;
  password_hash: string;
  school_id: string | null;
  year: string | null;
  bio: string;
  avatar_emoji: string;
  verification_status: VerificationStatus;
  verified_at: string | null;
  is_admin: number;
  is_suspended: number;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** A user as the UI consumes it: no password hash, with derived stats. */
export interface PublicUser {
  id: string;
  handle: string;
  name: string;
  school_id: string | null;
  school_name: string | null;
  year: string | null;
  bio: string;
  avatar_emoji: string;
  verification_status: VerificationStatus;
  is_suspended: number;
  created_at: string;
  rating_avg: number | null;
  rating_count: number;
  sessions_taught: number;
  hours_taught: number;
}

export interface UserSkillRow {
  id: string;
  user_id: string;
  skill_id: string;
  kind: SkillKind;
  level: SkillLevel;
  note: string;
  skill_name: string;
  skill_slug: string;
  category_name: string;
  category_slug: string;
  category_icon: string;
}

export interface SessionRow {
  id: string;
  learner_id: string;
  teacher_id: string;
  skill_id: string;
  status: SessionStatus;
  duration_minutes: number;
  credits: number;
  scheduled_at: string;
  mode: SessionMode;
  location: string;
  learner_message: string;
  teacher_note: string;
  learner_confirmed_at: string | null;
  teacher_confirmed_at: string | null;
  completed_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string;
  created_at: string;
  updated_at: string;
}

/** A session joined with the names the UI needs. */
export interface SessionDetail extends SessionRow {
  skill_name: string;
  skill_slug: string;
  learner_name: string;
  learner_handle: string;
  learner_avatar: string;
  teacher_name: string;
  teacher_handle: string;
  teacher_avatar: string;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  delta: number;
  reason: LedgerReason;
  session_id: string | null;
  balance_after: number;
  note: string;
  created_at: string;
}

export interface Rating {
  id: string;
  session_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  comment: string;
  tags: string;
  created_at: string;
  rater_name?: string;
  rater_handle?: string;
  rater_avatar?: string;
  skill_name?: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  session_id: string | null;
  category: ReportCategory;
  details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  resolution_note: string;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  reporter_name?: string;
  reported_name?: string;
  reported_handle?: string;
}

/** A browse/search result row with its match explanation. */
export interface MatchResult {
  user: PublicUser;
  teaches: { name: string; slug: string; level: SkillLevel; category_icon: string }[];
  wants: { name: string; slug: string }[];
  score: number;
  reasons: string[];
  /** true when they can teach something you want AND want something you teach */
  mutual: boolean;
}
