import Link from "next/link";
import type { MatchResult } from "@/lib/types";
import { Avatar, SkillPill, Stars, VerifiedBadge } from "./ui";

export function MatchCard({ result, showReasons }: { result: MatchResult; showReasons: boolean }) {
  const { user: person, teaches, wants, reasons, mutual } = result;

  return (
    <article className="card card-hover flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <Avatar label={person.name} size={48} href={`/u/${person.handle}`} />
          <div className="min-w-0">
            <Link
              href={`/u/${person.handle}`}
              className="block truncate font-display text-[1.0625rem] font-bold tracking-[-0.02em] hover:text-brand"
            >
              {person.name}
            </Link>
            <p className="truncate text-xs text-faint">
              {[person.year, person.school_name].filter(Boolean).join(" · ") || "SkillSwap member"}
            </p>
            <div className="mt-1.5">
              <Stars value={person.rating_avg} count={person.rating_count} />
            </div>
          </div>
        </div>
        {mutual ? (
          <span className="pill pill-credit flex-none" title="You each have something the other wants">
            Two-way
          </span>
        ) : null}
      </div>

      {person.bio ? (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted">{person.bio}</p>
      ) : null}

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-faint">Teaches</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {teaches.slice(0, 4).map((skill) => (
            <SkillPill
              key={skill.slug}
              name={skill.name}
              icon={skill.category_icon}
              level={skill.level}
            />
          ))}
          {teaches.length > 4 ? (
            <span className="pill pill-outline">+{teaches.length - 4} more</span>
          ) : null}
        </div>
      </div>

      {wants.length > 0 ? (
        <div className="mt-3.5">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-faint">Wants to learn</p>
          <p className="mt-1.5 line-clamp-1 text-xs text-muted">
            {wants.map((w) => w.name).join(" · ")}
          </p>
        </div>
      ) : null}

      {showReasons && reasons.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
          {reasons.slice(0, 2).map((reason) => (
            <li key={reason} className="flex gap-2 text-xs text-muted">
              <span aria-hidden style={{ color: "var(--c-brand)" }}>
                ↳
              </span>
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex gap-2 pt-1">
        <Link href={`/u/${person.handle}`} className="btn btn-quiet btn-sm flex-1">
          View profile
        </Link>
        <Link href={`/u/${person.handle}#request`} className="btn btn-primary btn-sm flex-1">
          Request a session
        </Link>
      </div>

      <div className="mt-3.5 flex items-center justify-between text-xs text-faint">
        <VerifiedBadge status={person.verification_status} />
        <span className="nums">
          {person.sessions_taught} session{person.sessions_taught === 1 ? "" : "s"} taught
        </span>
      </div>
    </article>
  );
}
