import Link from "next/link";

/** The wordmark. The two interlocking arrows stand for the exchange. */
export function Logo({
  className = "",
  onInk = false,
}: {
  className?: string;
  onInk?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="SkillSwap home"
    >
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-xl"
        style={{
          background: onInk ? "rgba(255,255,255,0.12)" : "var(--c-brand)",
          border: onInk ? "1px solid rgba(255,255,255,0.22)" : "none",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3.5 8.5h13l-3.2-3.2M20.5 15.5h-13l3.2 3.2"
            stroke={onInk ? "#fff" : "var(--c-on-brand)"}
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className="font-display text-[1.21rem] font-bold tracking-[-0.035em]"
        style={{ color: onInk ? "var(--c-on-ink)" : "var(--c-ink)" }}
      >
        Skill<span style={{ color: onInk ? "var(--c-credit-bright)" : "var(--c-brand)" }}>Swap</span>
      </span>
    </Link>
  );
}
