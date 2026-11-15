import Link from "next/link";
import { balanceOf } from "@/lib/credits";
import { unreadNotificationCount } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { logOutAction } from "@/app/actions/auth";
import { Logo } from "./logo";
import { Avatar, CreditPill } from "./ui";

const NAV = [
  { href: "/browse", label: "Find a teacher" },
  { href: "/categories", label: "Skills" },
  { href: "/how-it-works", label: "How credits work" },
  { href: "/safety", label: "Safety" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const balance = user ? balanceOf(user.id) : 0;
  const unread = user ? unreadNotificationCount(user.id) : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-muted transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <Link href="/dashboard/wallet" className="hidden sm:block" title="Your credit balance">
                <CreditPill credits={balance} />
              </Link>
              <Link
                href="/dashboard"
                className="btn btn-quiet btn-sm relative"
                aria-label={`Dashboard${unread ? `, ${unread} unread` : ""}`}
              >
                Dashboard
                {unread > 0 ? (
                  <span
                    className="nums absolute -right-1 -top-1 grid size-5 place-items-center rounded-full text-[0.625rem] font-bold"
                    style={{ background: "var(--c-brand)", color: "var(--c-on-brand)" }}
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              {user.is_admin ? (
                <Link href="/admin" className="btn btn-ghost btn-sm hidden md:inline-flex">
                  Moderation
                </Link>
              ) : null}
              <Link href={`/u/${user.handle}`} className="hidden sm:block">
                <Avatar label={user.avatar_emoji || user.name} size={34} />
              </Link>
              <form action={logOutAction} className="hidden md:block">
                <button type="submit" className="btn btn-ghost btn-sm">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Join free
              </Link>
            </>
          )}

          {/* No-JS mobile menu */}
          <details className="relative lg:hidden">
            <summary
              className="btn btn-ghost btn-sm list-none"
              aria-label="Open menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </summary>
            <div className="card absolute right-0 top-11 w-60 p-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
                >
                  {item.label}
                </Link>
              ))}
              {user ? (
                <>
                  <hr className="hr my-2" />
                  <Link
                    href="/dashboard/wallet"
                    className="block rounded-md px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
                  >
                    Wallet · {balance} credits
                  </Link>
                  <form action={logOutAction}>
                    <button
                      type="submit"
                      className="w-full rounded-md px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-surface-2"
                    >
                      Log out
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
