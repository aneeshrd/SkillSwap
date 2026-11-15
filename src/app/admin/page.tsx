import type { Metadata } from "next";
import Link from "next/link";
import {
  AdjustCreditsForm,
  ReinstateForm,
  ResolveReportForm,
  SuspendForm,
  VerifyDecisionForm,
} from "@/components/forms/admin-forms";
import { Avatar, EmptyState, StatTile, VerifiedBadge, formatWhen } from "@/components/ui";
import {
  communityStats,
  listPendingVerification,
  listReports,
  listSuspended,
  recentAudit,
} from "@/lib/queries";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Moderation" };

const CATEGORY_LABEL: Record<string, string> = {
  no_show: "No-show",
  inappropriate_behaviour: "Inappropriate behaviour",
  harassment: "Harassment",
  misrepresented_skill: "Misrepresented skill",
  safety_concern: "Safety concern",
  spam: "Spam",
  other: "Other",
};

export default async function AdminPage() {
  const admin = await requireAdmin();

  const reports = listReports();
  const open = reports.filter((r) => r.status === "open" || r.status === "reviewing");
  const closed = reports.filter((r) => r.status === "resolved" || r.status === "dismissed");
  const pendingVerification = listPendingVerification();
  const suspended = listSuspended();
  const audit = recentAudit();
  const stats = communityStats();

  return (
    <div className="wrap space-y-12 py-12">
      <header>
        <p className="eyebrow">Moderation</p>
        <h1 className="mt-3 text-[2rem]">Keeping the exchange honest</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Signed in as {admin.name}. Every action on this page is written to an audit log with your
          name against it.
        </p>
      </header>

      <section className="card-flat grid gap-8 p-7 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile figure={open.length} label="Open reports" sub="needing a decision" />
        <StatTile figure={pendingVerification.length} label="Unverified accounts" sub="can't book yet" />
        <StatTile figure={suspended.length} label="Suspended" sub="signed out everywhere" />
        <StatTile
          figure={stats.credits_circulating}
          label="Credits in circulation"
          sub="sum of every ledger row"
        />
      </section>

      {/* ------------------------------------------------------- reports */}
      <section>
        <h2 className="text-xl">Open reports</h2>
        {open.length === 0 ? (
          <div className="mt-5">
            <EmptyState icon="·" title="Queue is clear" body="No reports are waiting on a decision." />
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {open.map((report) => (
              <li key={report.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="pill pill-danger">{CATEGORY_LABEL[report.category]}</span>
                      <span className="pill pill-neutral">{report.status}</span>
                    </div>
                    <p className="mt-3 text-sm">
                      <Link href={`/u/${report.reported_handle}`} className="link">
                        {report.reported_name}
                      </Link>{" "}
                      <span className="text-faint">reported by {report.reporter_name}</span>
                    </p>
                  </div>
                  <p className="text-xs text-faint">{formatWhen(report.created_at)}</p>
                </div>

                <blockquote className="mt-4 border-l-2 border-line pl-4 text-sm leading-relaxed text-muted">
                  {report.details}
                </blockquote>

                <div className="mt-5 grid gap-5 border-t border-line pt-5 md:grid-cols-2">
                  <ResolveReportForm reportId={report.id} />
                  <div>
                    <SuspendForm userId={report.reported_user_id} name={report.reported_name ?? "account"} />
                    <p className="hint mt-3 break-all">
                      Student ID: <code>{report.reported_user_id}</code>
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------- verification */}
      <section>
        <h2 className="text-xl">Verification queue</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Students normally verify themselves with an emailed code. Use this only when someone
          can&apos;t receive mail at their school address.
        </p>

        {pendingVerification.length === 0 ? (
          <p className="mt-4 text-sm text-faint">Everyone is verified.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {pendingVerification.map((person) => (
              <li key={person.id} className="card flex flex-wrap items-center gap-4 p-5">
                <Avatar label={person.name} size={40} href={`/u/${person.handle}`} />
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${person.handle}`} className="font-semibold hover:text-brand">
                    {person.name}
                  </Link>
                  <p className="text-xs text-faint">
                    {person.school_name ?? "No school matched"} · joined {formatWhen(person.created_at)}
                  </p>
                </div>
                <VerifiedBadge status={person.verification_status} showUnverified />
                <VerifyDecisionForm userId={person.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------------------------------------------- suspended */}
      {suspended.length > 0 ? (
        <section>
          <h2 className="text-xl">Suspended accounts</h2>
          <ul className="mt-5 space-y-3">
            {suspended.map((person) => (
              <li key={person.id} className="card flex flex-wrap items-center gap-4 p-5">
                <Avatar label={person.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{person.name}</p>
                  <p className="text-xs text-faint">{person.school_name}</p>
                </div>
                <ReinstateForm userId={person.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ----------------------------------------------------- credits */}
      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-xl">Credit correction</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            For returning credits after a no-show. A correction is an ordinary ledger row with your
            reason attached — it never rewrites history.
          </p>
          <div className="card mt-5 p-6">
            <AdjustCreditsForm />
          </div>
        </div>

        <div>
          <h2 className="text-xl">Audit log</h2>
          {audit.length === 0 ? (
            <p className="mt-4 text-sm text-faint">No moderator actions recorded yet.</p>
          ) : (
            <ul className="mt-5 space-y-2">
              {audit.map((entry) => (
                <li key={entry.id} className="card-flat px-5 py-3.5 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{entry.action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-faint">{formatWhen(entry.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {entry.admin_name} · {entry.target_type}
                    {entry.detail ? ` · ${entry.detail}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------ closed */}
      {closed.length > 0 ? (
        <section>
          <h2 className="text-xl">Closed reports</h2>
          <ul className="mt-5 space-y-2">
            {closed.map((report) => (
              <li key={report.id} className="card-flat px-5 py-3.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{CATEGORY_LABEL[report.category]}</strong> · {report.reported_name}
                  </span>
                  <span className="pill pill-neutral">{report.status}</span>
                </div>
                {report.resolution_note ? (
                  <p className="mt-1.5 text-xs text-muted">{report.resolution_note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
