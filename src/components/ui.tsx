import Link from "next/link";
import type { ReactNode } from "react";
import { MINUTES_PER_CREDIT } from "@/lib/credits";
import type { SkillLevel, VerificationStatus } from "@/lib/types";

/* ------------------------------------------------------------------ avatar */
export function Avatar({
  label,
  size = 44,
  href,
}: {
  label: string;
  size?: number;
  href?: string;
}) {
  const initials = label.slice(0, 2).toUpperCase();
  const avatar = (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials}
    </span>
  );
  return href ? (
    <Link href={href} aria-label={label}>
      {avatar}
    </Link>
  ) : (
    avatar
  );
}

/* ------------------------------------------------------------ verification */
export function VerifiedBadge({
  status,
  showUnverified = false,
}: {
  status: VerificationStatus;
  showUnverified?: boolean;
}) {
  if (status === "verified") {
    return (
      <span className="pill pill-verify" title="School email confirmed">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M20 6.5 9.5 17 4 11.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Verified student
      </span>
    );
  }
  if (!showUnverified) return null;
  return <span className="pill pill-neutral">Not yet verified</span>;
}

/* ------------------------------------------------------------- credit pill */
export function CreditPill({
  credits,
  showTime = true,
  size = "md",
}: {
  credits: number;
  showTime?: boolean;
  size?: "sm" | "md";
}) {
  const minutes = credits * MINUTES_PER_CREDIT;
  const time = minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`;
  return (
    <span className={`pill pill-credit nums ${size === "sm" ? "text-[0.6875rem]" : ""}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M12 7.5v5l3 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
      {credits}
      <span className="font-medium opacity-80">
        {credits === 1 ? "credit" : "credits"}
        {showTime ? ` · ${time}` : ""}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------- stars */
export function Stars({
  value,
  count,
  size = 14,
}: {
  value: number | null;
  count?: number;
  size?: number;
}) {
  if (value === null) {
    return <span className="text-xs text-faint">No ratings yet</span>;
  }
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <svg key={n} width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.44 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z"
              fill={n <= rounded ? "var(--c-credit-bright)" : "var(--c-line-strong)"}
            />
          </svg>
        ))}
      </span>
      <span className="nums text-xs font-semibold text-muted">
        {value.toFixed(1)}
        {count !== undefined ? ` (${count})` : ""}
      </span>
      <span className="sr-only">
        {value.toFixed(1)} out of 5{count !== undefined ? ` from ${count} ratings` : ""}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------- skill pill */
const LEVEL_LABEL: Record<SkillLevel, string> = {
  beginner: "can get you started",
  intermediate: "solid",
  advanced: "advanced",
};

export function SkillPill({
  name,
  level,
  icon,
  href,
}: {
  name: string;
  level?: SkillLevel;
  icon?: string;
  href?: string;
}) {
  const inner = (
    <>
      {icon ? <span aria-hidden>{icon}</span> : null}
      {name}
      {level ? (
        <span className="font-medium opacity-70" title={LEVEL_LABEL[level]}>
          · {level}
        </span>
      ) : null}
    </>
  );
  return href ? (
    <Link href={href} className="pill pill-skill hover:opacity-80">
      {inner}
    </Link>
  ) : (
    <span className="pill pill-skill">{inner}</span>
  );
}

/* ------------------------------------------------------------- stat tile */
export function StatTile({
  figure,
  label,
  sub,
  onInk = false,
}: {
  figure: ReactNode;
  label: string;
  sub?: string;
  onInk?: boolean;
}) {
  return (
    <div>
      <div
        className="stat-figure text-[2rem] md:text-[2.5rem]"
        style={{ color: onInk ? "var(--c-on-ink)" : "var(--c-ink)" }}
      >
        {figure}
      </div>
      <div
        className="mt-1.5 text-sm font-semibold"
        style={{ color: onInk ? "var(--c-on-ink)" : "var(--c-ink)" }}
      >
        {label}
      </div>
      {sub ? (
        <div
          className="mt-0.5 text-xs"
          style={{ color: onInk ? "var(--c-on-ink-muted)" : "var(--c-faint)" }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------- section header */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  onInk = false,
  action,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
  onInk?: boolean;
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-4 ${
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"
      }`}
    >
      <div className={align === "center" ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow ? (
          <p className={`eyebrow ${onInk ? "eyebrow-on-ink" : ""}`}>{eyebrow}</p>
        ) : null}
        <h2
          className="mt-2.5 text-[1.75rem] md:text-[2.25rem]"
          style={{ color: onInk ? "var(--c-on-ink)" : "var(--c-ink)" }}
        >
          {title}
        </h2>
        {lead ? (
          <p
            className="mt-3 text-[1.0625rem] leading-relaxed"
            style={{ color: onInk ? "var(--c-on-ink-muted)" : "var(--c-muted)" }}
          >
            {lead}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------- empty state */
export function EmptyState({
  title,
  body,
  action,
  icon = "·",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="card-flat px-6 py-12 text-center">
      <div
        className="mx-auto grid size-12 place-items-center rounded-full text-xl"
        style={{ background: "var(--c-brand-soft)", color: "var(--c-brand)" }}
        aria-hidden
      >
        {icon}
      </div>
      <h3 className="mt-4 text-lg">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- helpers */
export function formatWhen(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeDay(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.round(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}
