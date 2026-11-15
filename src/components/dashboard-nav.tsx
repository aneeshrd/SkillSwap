"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/sessions", label: "Sessions" },
  { href: "/dashboard/wallet", label: "Wallet" },
  { href: "/dashboard/profile", label: "Profile & skills" },
  { href: "/dashboard/safety", label: "Safety" },
];

export function DashboardNav({ badges }: { badges?: Record<string, number> }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="-mx-1 overflow-x-auto">
      <ul className="flex gap-1 border-b border-line px-1">
        {LINKS.map((link) => {
          const active =
            link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
          const badge = badges?.[link.href];
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-colors"
                style={{
                  color: active ? "var(--c-brand)" : "var(--c-muted)",
                  boxShadow: active ? "inset 0 -2px 0 0 var(--c-brand)" : "none",
                }}
              >
                {link.label}
                {badge ? (
                  <span
                    className="nums grid min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-bold"
                    style={{ background: "var(--c-brand)", color: "var(--c-on-brand)" }}
                  >
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
