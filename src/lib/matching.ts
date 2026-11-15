import type { PublicUser, SkillLevel } from "./types";

export interface MatchInput {
  candidate: PublicUser;
  /** Skills the candidate can teach. */
  candidateTeaches: { skill_id: string; name: string; slug: string; level: SkillLevel; category_icon: string }[];
  /** Skills the candidate wants to learn. */
  candidateWants: { skill_id: string; name: string; slug: string }[];
  /** Skill ids the viewer wants to learn. */
  viewerWants: Set<string>;
  /** Skill ids the viewer can teach. */
  viewerTeaches: Set<string>;
  viewerSchoolId: string | null;
  candidateSchoolId: string | null;
}

const LEVEL_WEIGHT: Record<SkillLevel, number> = {
  beginner: 0.6,
  intermediate: 1,
  advanced: 1.25,
};

export interface MatchScore {
  score: number;
  reasons: string[];
  mutual: boolean;
  /** Skills this person can teach that the viewer asked to learn. */
  overlapTeaches: { name: string; slug: string; level: SkillLevel; category_icon: string }[];
  /** Skills the viewer teaches that this person wants. */
  overlapWants: { name: string; slug: string }[];
}

/**
 * Ranking is deliberately explainable: every point added also appends a
 * human-readable reason, which the browse page shows under each card. If we
 * can't say why someone was surfaced, we don't surface them.
 */
export function scoreMatch(input: MatchInput): MatchScore {
  const reasons: string[] = [];
  let score = 0;

  const overlapTeaches = input.candidateTeaches.filter((s) => input.viewerWants.has(s.skill_id));
  const overlapWants = input.candidateWants.filter((s) => input.viewerTeaches.has(s.skill_id));

  for (const skill of overlapTeaches) {
    score += 40 * LEVEL_WEIGHT[skill.level];
  }
  if (overlapTeaches.length === 1) {
    reasons.push(`Teaches ${overlapTeaches[0].name}, which you want to learn`);
  } else if (overlapTeaches.length > 1) {
    reasons.push(
      `Teaches ${overlapTeaches.length} skills on your learning list, including ${overlapTeaches[0].name}`
    );
  }

  const mutual = overlapTeaches.length > 0 && overlapWants.length > 0;
  if (overlapWants.length > 0) {
    score += 18;
    reasons.push(`Wants to learn ${overlapWants[0].name}, which you teach`);
  }
  if (mutual) {
    score += 12;
    reasons.push("Two-way match — you each have something the other wants");
  }

  if (input.candidate.rating_count >= 2 && input.candidate.rating_avg !== null) {
    score += input.candidate.rating_avg * 5;
    reasons.push(
      `Rated ${input.candidate.rating_avg.toFixed(1)} across ${input.candidate.rating_count} sessions`
    );
  } else if (input.candidate.sessions_taught === 0) {
    // Newcomers need a first session. Nudge, don't bury.
    score += 6;
    reasons.push("New here — could use a first session");
  }

  if (input.candidate.verification_status === "verified") {
    score += 8;
  }

  if (
    input.viewerSchoolId &&
    input.candidateSchoolId &&
    input.viewerSchoolId === input.candidateSchoolId
  ) {
    score += 14;
    reasons.push("At your school");
  }

  // Mild experience weighting, flattened so prolific tutors don't dominate.
  score += Math.min(12, Math.log2(input.candidate.sessions_taught + 1) * 4);

  return {
    score: Math.round(score * 10) / 10,
    reasons,
    mutual,
    overlapTeaches: overlapTeaches.map(({ name, slug, level, category_icon }) => ({
      name,
      slug,
      level,
      category_icon,
    })),
    overlapWants: overlapWants.map(({ name, slug }) => ({ name, slug })),
  };
}
