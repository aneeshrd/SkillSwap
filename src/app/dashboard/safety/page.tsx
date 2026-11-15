import type { Metadata } from "next";
import Link from "next/link";
import { unblockUserAction } from "@/app/actions/safety";
import { EmptyState, formatWhen } from "@/components/ui";
import { getDb } from "@/lib/db";
import { listBlockedUsers } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import type { Report } from "@/lib/types";

export const metadata: Metadata = { title: "Safety" };

const STATUS_COPY: Record<string, string> = {
  open: "Waiting for a moderator",
  reviewing: "A moderator is looking into it",
  resolved: "Resolved",
  dismissed: "Closed with no action",
};

export default async function SafetySettingsPage() {
  const user = await requireUser("/dashboard/safety");

  const blocked = listBlockedUsers(user.id);
  const myReports = getDb()
    .prepare(
      `SELECT r.*, u.name AS reported_name, u.handle AS reported_handle
         FROM reports r JOIN users u ON u.id = r.reported_user_id
        WHERE r.reporter_id = ? ORDER BY r.created_at DESC`
    )
    .all(user.id) as Report[];

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-[1.875rem]">Safety</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Blocking is instant and private. Reports go to a named moderator at your school, who
          records what they did about it.
        </p>
      </header>

      <section>
        <h2 className="text-xl">
          Blocked students{" "}
          <span className="nums text-base font-normal text-muted">({blocked.length})</span>
        </h2>
        <p className="mt-2 text-sm text-muted">
          You and anyone here are hidden from each other across SkillSwap, in both directions.
        </p>

        {blocked.length === 0 ? (
          <p className="mt-4 text-sm text-faint">You haven&apos;t blocked anyone.</p>
        ) : (
          <ul className="mt-5 space-y-2">
            {blocked.map((person) => (
              <li key={person.id} className="card flex items-center justify-between gap-4 px-5 py-3.5">
                <span className="font-semibold">{person.name}</span>
                <form action={unblockUserAction}>
                  <input type="hidden" name="user_id" value={person.id} />
                  <button type="submit" className="btn btn-ghost btn-sm">
                    Unblock
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl">Reports you&apos;ve filed</h2>

        {myReports.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon="·"
              title="You haven't reported anyone"
              body="If a session goes wrong — a no-show, something that made you uncomfortable, a skill that wasn't real — report it from that student's profile. It's read by a person."
              action={
                <Link href="/safety#reporting" className="btn btn-ghost">
                  How reporting works
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {myReports.map((report) => (
              <li key={report.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">
                    {report.category.replace(/_/g, " ")} ·{" "}
                    <Link href={`/u/${report.reported_handle}`} className="link">
                      {report.reported_name}
                    </Link>
                  </p>
                  <span
                    className={`pill ${report.status === "open" ? "pill-credit" : "pill-neutral"}`}
                  >
                    {STATUS_COPY[report.status]}
                  </span>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{report.details}</p>
                {report.resolution_note ? (
                  <p className="notice notice-info mt-3">
                    <strong>Moderator:</strong> {report.resolution_note}
                  </p>
                ) : null}
                <p className="mt-2.5 text-xs text-faint">Filed {formatWhen(report.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-flat p-7">
        <h2 className="text-lg">In an emergency</h2>
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted">
          SkillSwap is a student project, not an emergency service. If you are in immediate danger,
          contact your local emergency number or campus security first. Report it here afterwards so
          the account can be suspended.
        </p>
      </section>
    </div>
  );
}
