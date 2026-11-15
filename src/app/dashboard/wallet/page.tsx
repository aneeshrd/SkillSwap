import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, StatTile, formatWhen } from "@/components/ui";
import {
  LEDGER_LABELS,
  MINUTES_PER_CREDIT,
  balanceOf,
  heldCreditsOf,
  lifetimeEarnedOf,
} from "@/lib/credits";
import { getLedger } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your wallet" };

export default async function WalletPage() {
  const user = await requireUser("/dashboard/wallet");

  const balance = balanceOf(user.id);
  const held = heldCreditsOf(user.id);
  const earned = lifetimeEarnedOf(user.id);
  const ledger = getLedger(user.id);

  const spent = ledger
    .filter((entry) => entry.reason === "session_hold")
    .reduce((sum, entry) => sum + Math.abs(entry.delta), 0);

  return (
    <div className="space-y-11">
      <header>
        <h1 className="text-[1.875rem]">Your wallet</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          One credit is {MINUTES_PER_CREDIT} minutes of another student&apos;s time. Credits
          can&apos;t be bought, sold or cashed out — they only exist to keep the exchange fair.
        </p>
      </header>

      <section className="card-flat grid gap-8 p-7 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="eyebrow">Available now</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="stat-figure text-[3rem]">{balance}</span>
            <span className="text-sm font-semibold text-muted">
              credit{balance === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            {(balance * MINUTES_PER_CREDIT) / 60} hour
            {(balance * MINUTES_PER_CREDIT) / 60 === 1 ? "" : "s"}
          </p>
        </div>
        <StatTile figure={held} label="On hold" sub="committed to open sessions" />
        <StatTile figure={earned} label="Earned teaching" sub="all time" />
        <StatTile figure={spent} label="Committed to learning" sub="all time" />
      </section>

      <section>
        <h2 className="text-xl">Every movement</h2>
        <p className="mt-2 text-sm text-muted">
          This list is the record. Your balance is the sum of these rows and nothing else — there
          is no separate number anyone can edit.
        </p>

        {ledger.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="·"
              title="No movements yet"
              body="Verify your school email to receive your welcome credits, then teach or learn to start the ledger."
              action={
                <Link href="/browse" className="btn btn-primary">
                  Find a teacher
                </Link>
              }
            />
          </div>
        ) : (
          <div className="card mt-6 overflow-hidden">
            <table className="w-full text-sm">
              <caption className="sr-only">Your credit ledger, newest first</caption>
              <thead>
                <tr className="border-b border-line bg-surface text-left">
                  <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-faint">
                    What
                  </th>
                  <th scope="col" className="hidden px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-faint sm:table-cell">
                    When
                  </th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-faint">
                    Change
                  </th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-faint">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{LEDGER_LABELS[entry.reason]}</p>
                      {entry.note ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">{entry.note}</p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-faint sm:hidden">
                        {formatWhen(entry.created_at)}
                      </p>
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-3.5 text-muted sm:table-cell">
                      {formatWhen(entry.created_at)}
                    </td>
                    <td
                      className="nums whitespace-nowrap px-5 py-3.5 text-right font-bold"
                      style={{ color: entry.delta > 0 ? "var(--c-verify)" : "var(--c-muted)" }}
                    >
                      {entry.delta > 0 ? "+" : ""}
                      {entry.delta}
                    </td>
                    <td className="nums whitespace-nowrap px-5 py-3.5 text-right font-semibold">
                      {entry.balance_after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card-flat p-7">
        <h2 className="text-lg">Why credits and not money</h2>
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted">
          The moment a session has a price, the students who most need help are the ones who
          can&apos;t afford it — and the students with the most valuable time stop volunteering it.
          A time credit is worth the same whoever earns it: an hour of first-year Spanish and an
          hour of graduate econometrics both pay two credits.
        </p>
        <Link href="/how-it-works#not-a-marketplace" className="link mt-4 inline-block text-sm">
          Read more about the model →
        </Link>
      </section>
    </div>
  );
}
