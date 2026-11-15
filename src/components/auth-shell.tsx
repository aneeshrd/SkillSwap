import Link from "next/link";
import type { ReactNode } from "react";
import { SIGNUP_BONUS_CREDITS } from "@/lib/credits";
import { SLOGAN } from "@/lib/constants";

/** Shared two-column frame for signup / login / verify. */
export function AuthShell({
  title,
  lead,
  children,
  aside,
}: {
  title: string;
  lead: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_0.85fr]">
      <div className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-md">
          <h1 className="text-[2rem] sm:text-[2.375rem]">{title}</h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{lead}</p>
          <div className="mt-9">{children}</div>
        </div>
      </div>

      <aside className="ink-panel hidden lg:block">
        <div className="grid-lines h-full">
          <div className="flex h-full flex-col justify-center px-12 py-16">
            {aside ?? <DefaultAside />}
          </div>
        </div>
      </aside>
    </div>
  );
}

function DefaultAside() {
  return (
    <>
      <p className="eyebrow eyebrow-on-ink">Why SkillSwap</p>
      <p
        className="mt-5 font-display text-[2rem] font-bold leading-[1.05] tracking-[-0.035em]"
        style={{ color: "var(--c-on-ink)" }}
      >
        {SLOGAN}
      </p>
      <ul className="mt-9 space-y-5">
        {[
          {
            title: `${SIGNUP_BONUS_CREDITS} credits the moment you verify`,
            body: "A full hour of learning before you've taught anyone anything.",
          },
          {
            title: "Students only",
            body: "Everyone confirms a school email address. No agencies, no ads, no strangers.",
          },
          {
            title: "Nothing to pay, ever",
            body: "Credits have no cash value and can't be bought. Time is the only currency here.",
          },
        ].map((item) => (
          <li key={item.title} className="flex gap-3.5">
            <span
              className="mt-1 grid size-6 flex-none place-items-center rounded-full"
              style={{ background: "rgb(255 255 255 / 0.12)" }}
              aria-hidden
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6.5 9.5 17 4 11.5"
                  stroke="var(--c-credit-bright)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p className="font-semibold" style={{ color: "var(--c-on-ink)" }}>
                {item.title}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed" style={{ color: "var(--c-on-ink-muted)" }}>
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-xs" style={{ color: "var(--c-on-ink-muted)" }}>
        Questions first?{" "}
        <Link href="/how-it-works" className="font-semibold underline underline-offset-4">
          Read how credits work
        </Link>
      </p>
    </>
  );
}
