import Link from "next/link";
import { SLOGAN } from "@/lib/constants";
import { Logo } from "./logo";

const COLUMNS = [
  {
    heading: "Swap",
    links: [
      { href: "/browse", label: "Find a teacher" },
      { href: "/categories", label: "Browse skills" },
      { href: "/signup", label: "Create an account" },
    ],
  },
  {
    heading: "Understand",
    links: [
      { href: "/how-it-works", label: "How credits work" },
      { href: "/how-it-works#faq", label: "Questions" },
      { href: "/safety", label: "Safety and verification" },
    ],
  },
  {
    heading: "Community",
    links: [
      { href: "/safety#guidelines", label: "Community guidelines" },
      { href: "/safety#reporting", label: "Report a problem" },
      { href: "/how-it-works#not-a-marketplace", label: "Why there's no money" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="wrap py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs font-display text-lg leading-snug tracking-[-0.03em] text-ink">
              {SLOGAN}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              A student-run exchange for tutoring and skill-building. Teach an hour, learn an
              hour — no money involved.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-faint">
                {column.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-muted transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className="hr my-10" />

        <div className="flex flex-col gap-3 text-xs text-faint md:flex-row md:items-center md:justify-between">
          <p>
            SkillSwap is a non-commercial student project. Credits have no cash value and cannot be
            bought, sold or transferred off the platform.
          </p>
          <p>Built by students, for students.</p>
        </div>
      </div>
    </footer>
  );
}
