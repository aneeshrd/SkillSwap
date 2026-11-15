import type { Metadata } from "next";
import Link from "next/link";
import { markNotificationsReadAction } from "@/app/actions/notifications";
import { MatchCard } from "@/components/match-card";
import { SessionCard } from "@/components/session-card";
import { Avatar, CreditPill, EmptyState, StatTile, formatWhen } from "@/components/ui";
import { MINUTES_PER_CREDIT, balanceOf, heldCreditsOf, lifetimeEarnedOf } from "@/lib/credits";
import {
  getIncomingRequests,
  getOutgoingRequests,
  getUnratedSessions,
  getUpcomingSessions,
  getUserSkills,
  listNotifications,
  searchTeachers,
} from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const user = await requireUser();

  const balance = balanceOf(user.id);
  const held = heldCreditsOf(user.id);
  const earned = lifetimeEarnedOf(user.id);

  const incoming = getIncomingRequests(user.id);
  const outgoing = getOutgoingRequests(user.id);
  const upcoming = getUpcomingSessions(user.id);
  const unrated = getUnratedSessions(user.id);
  const notifications = listNotifications(user.id, 5);

  const teaches = getUserSkills(user.id, "teach");
  const wants = getUserSkills(user.id, "learn");
  const suggestions = searchTeachers({ viewerId: user.id, sort: "match", limit: 3 });

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-12">
      {welcome ? (
        <div className="notice notice-ok">
          <strong>You&apos;re verified.</strong> Two credits — a full hour of learning — are in your
          account. Spend them on anyone here; you don&apos;t owe them to anybody.
        </div>
      ) : null}

      {/* ---------------------------------------------------------- header */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar label={user.avatar_emoji || user.name} size={56} />
          <div>
            <h1 className="text-[1.875rem]">Hello, {firstName}</h1>
            <p className="mt-1 text-sm text-muted">
              {teaches.length > 0
                ? `You're offering ${teaches.length} skill${teaches.length === 1 ? "" : "s"}${
                    wants.length ? ` and learning ${wants.length}` : ""
                  }.`
                : "Add a skill you can teach and students can start booking you."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/browse" className="btn btn-primary">
            Find a teacher
          </Link>
          <Link href="/dashboard/profile" className="btn btn-ghost">
            Edit profile
          </Link>
        </div>
      </header>

      {/* --------------------------------------------------------- balance */}
      <section className="card-flat grid gap-7 p-7 sm:grid-cols-3">
        <div>
          <p className="eyebrow">Your balance</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="stat-figure text-[3rem]">{balance}</span>
            <span className="text-sm font-semibold text-muted">
              credit{balance === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            {(balance * MINUTES_PER_CREDIT) / 60} hour
            {(balance * MINUTES_PER_CREDIT) / 60 === 1 ? "" : "s"} of anyone&apos;s time
          </p>
        </div>

        <StatTile
          figure={held}
          label="Held in open sessions"
          sub="returned if a request is declined"
        />
        <StatTile figure={earned} label="Earned by teaching" sub="all time" />

        <div className="sm:col-span-3">
          <Link href="/dashboard/wallet" className="link text-sm">
            See every credit movement →
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------ needs you */}
      {incoming.length > 0 || unrated.length > 0 || notifications.some((n) => !n.read_at) ? (
        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl">Needs you</h2>
            {notifications.some((n) => !n.read_at) ? (
              <form action={markNotificationsReadAction}>
                <button type="submit" className="link text-sm">
                  Mark all read
                </button>
              </form>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {incoming.length > 0 ? (
              <Link href="/dashboard/requests" className="card card-hover block p-5">
                <p className="pill pill-credit">
                  {incoming.length} request{incoming.length === 1 ? "" : "s"} waiting
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {incoming[0].learner_name} asked for help with {incoming[0].skill_name}
                  {incoming.length > 1 ? `, and ${incoming.length - 1} more` : ""}. Their credits
                  are on hold until you answer.
                </p>
                <p className="link mt-3 text-sm">Answer requests →</p>
              </Link>
            ) : null}

            {unrated.length > 0 ? (
              <Link href="/dashboard/sessions" className="card card-hover block p-5">
                <p className="pill pill-skill">
                  {unrated.length} session{unrated.length === 1 ? "" : "s"} to rate
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Ratings are how the next student decides who to ask. It takes ten seconds.
                </p>
                <p className="link mt-3 text-sm">Leave a rating →</p>
              </Link>
            ) : null}

            {notifications
              .filter((n) => !n.read_at)
              .slice(0, 2)
              .map((note) => (
                <Link key={note.id} href={note.href || "/dashboard"} className="card card-hover block p-5">
                  <p className="text-sm font-semibold">{note.title}</p>
                  {note.body ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{note.body}</p>
                  ) : null}
                  <p className="mt-2.5 text-xs text-faint">{formatWhen(note.created_at)}</p>
                </Link>
              ))}
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------- upcoming */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl">Coming up</h2>
          <Link href="/dashboard/sessions" className="link text-sm">
            All sessions
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon="→"
              title="Nothing scheduled"
              body={
                balance > 0
                  ? `You have ${balance} credit${balance === 1 ? "" : "s"} sitting unspent. Find someone teaching what you want to learn.`
                  : "Teach a session to earn credits, then spend them on anything you like."
              }
              action={
                <Link href="/browse" className="btn btn-primary">
                  Browse teachers
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {upcoming.slice(0, 4).map((session) => (
              <SessionCard key={session.id} session={session} viewerId={user.id} />
            ))}
          </div>
        )}

        {outgoing.length > 0 ? (
          <p className="mt-4 text-sm text-muted">
            You also have{" "}
            <Link href="/dashboard/requests" className="link">
              {outgoing.length} request{outgoing.length === 1 ? "" : "s"} waiting on a reply
            </Link>
            .
          </p>
        ) : null}
      </section>

      {/* ------------------------------------------------------ suggestions */}
      {suggestions.length > 0 ? (
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl">Matched to you</h2>
              <p className="mt-1.5 text-sm text-muted">
                {wants.length > 0
                  ? "Ranked against the skills on your learning list."
                  : "Add skills you want to learn and this gets much sharper."}
              </p>
            </div>
            <Link href="/browse" className="link text-sm">
              See everyone
            </Link>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((result) => (
              <MatchCard key={result.user.id} result={result} showReasons />
            ))}
          </div>
        </section>
      ) : null}

      {teaches.length === 0 ? (
        <section className="card-flat flex flex-col gap-5 p-7 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-lg">You can&apos;t earn credits yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Nobody can book you until you list at least one skill you can teach. It doesn&apos;t
              have to be academic — bike repair and meal prep get booked here too.
            </p>
          </div>
          <Link href="/dashboard/profile" className="btn btn-primary flex-none">
            Add a skill
          </Link>
        </section>
      ) : null}

      <div className="flex justify-center pt-4">
        <CreditPill credits={balance} />
      </div>
    </div>
  );
}
