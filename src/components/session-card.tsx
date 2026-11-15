import Link from "next/link";
import type { SessionDetail, SessionStatus } from "@/lib/types";
import { Avatar, CreditPill, formatWhen, relativeDay } from "./ui";

const STATUS_STYLE: Record<SessionStatus, { label: string; cls: string }> = {
  pending: { label: "Awaiting reply", cls: "pill-credit" },
  accepted: { label: "Confirmed", cls: "pill-verify" },
  completed: { label: "Complete", cls: "pill-neutral" },
  declined: { label: "Declined", cls: "pill-neutral" },
  cancelled: { label: "Cancelled", cls: "pill-neutral" },
  expired: { label: "Expired", cls: "pill-neutral" },
  disputed: { label: "Disputed", cls: "pill-danger" },
};

export function SessionCard({
  session,
  viewerId,
  children,
}: {
  session: SessionDetail;
  viewerId: string;
  children?: React.ReactNode;
}) {
  const asLearner = session.learner_id === viewerId;
  const other = asLearner
    ? { name: session.teacher_name, handle: session.teacher_handle }
    : { name: session.learner_name, handle: session.learner_handle };
  const status = STATUS_STYLE[session.status];

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <Avatar label={other.name} size={44} href={`/u/${other.handle}`} />
          <div className="min-w-0">
            <p className="font-display text-[1.0625rem] font-bold tracking-[-0.02em]">
              {session.skill_name}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {asLearner ? "Learning from" : "Teaching"}{" "}
              <Link href={`/u/${other.handle}`} className="font-semibold hover:text-brand">
                {other.name}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex flex-none flex-wrap items-center gap-2">
          <span className={`pill ${status.cls}`}>{status.label}</span>
          <CreditPill credits={session.credits} showTime={false} size="sm" />
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-faint">When</dt>
          <dd className="font-medium">
            {formatWhen(session.scheduled_at)}{" "}
            <span className="text-faint">({relativeDay(session.scheduled_at)})</span>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-faint">Where</dt>
          <dd className="font-medium">
            {session.mode === "video" ? "Video call" : session.location || "In person"}
          </dd>
        </div>
      </dl>

      {session.learner_message ? (
        <blockquote className="mt-4 border-l-2 border-line pl-3.5 text-sm leading-relaxed text-muted">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-faint">
            {asLearner ? "You wrote" : `${session.learner_name.split(" ")[0]} wrote`}
          </span>
          <p className="mt-1">{session.learner_message}</p>
        </blockquote>
      ) : null}

      {session.teacher_note ? (
        <blockquote className="mt-3 border-l-2 pl-3.5 text-sm leading-relaxed text-muted" style={{ borderColor: "var(--c-brand)" }}>
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-faint">
            {asLearner ? `${session.teacher_name.split(" ")[0]} replied` : "You replied"}
          </span>
          <p className="mt-1">{session.teacher_note}</p>
        </blockquote>
      ) : null}

      {session.cancel_reason ? (
        <p className="mt-3 text-sm italic text-muted">“{session.cancel_reason}”</p>
      ) : null}

      {children ? <div className="mt-5 border-t border-line pt-4">{children}</div> : null}
    </article>
  );
}
