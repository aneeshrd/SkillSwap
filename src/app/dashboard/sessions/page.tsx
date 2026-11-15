import type { Metadata } from "next";
import Link from "next/link";
import { CancelForm, ConfirmForm, RateForm } from "@/components/forms/session-forms";
import { SessionCard } from "@/components/session-card";
import { EmptyState } from "@/components/ui";
import { getPastSessions, getUnratedSessions, getUpcomingSessions } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your sessions" };

export default async function SessionsPage() {
  const user = await requireUser("/dashboard/sessions");

  const upcoming = getUpcomingSessions(user.id);
  const unrated = getUnratedSessions(user.id);
  const past = getPastSessions(user.id);
  const unratedIds = new Set(unrated.map((s) => s.id));

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-[1.875rem]">Confirmed sessions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Credits only move when both of you confirm a session happened. That&apos;s deliberate —
          nobody can pay themselves.
        </p>

        {upcoming.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="→"
              title="Nothing confirmed yet"
              body="Once a teacher accepts your request it appears here, with the time and place."
              action={
                <Link href="/browse" className="btn btn-primary">
                  Browse teachers
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {upcoming.map((session) => {
              const asLearner = session.learner_id === user.id;
              const mine = asLearner
                ? session.learner_confirmed_at
                : session.teacher_confirmed_at;
              const theirs = asLearner
                ? session.teacher_confirmed_at
                : session.learner_confirmed_at;
              const started = new Date(session.scheduled_at).getTime() <= Date.now();

              return (
                <SessionCard key={session.id} session={session} viewerId={user.id}>
                  {started ? (
                    <div className="space-y-3">
                      <ConfirmForm
                        sessionId={session.id}
                        alreadyConfirmed={Boolean(mine)}
                        waitingOnOther={!theirs}
                      />
                      {theirs && !mine ? (
                        <p className="text-xs text-muted">
                          They&apos;ve already confirmed. Yours releases the credits.
                        </p>
                      ) : null}
                      <CancelForm sessionId={session.id} label="It didn't happen" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-muted">
                        You&apos;ll both confirm this once it&apos;s taken place.
                      </p>
                      <CancelForm sessionId={session.id} />
                    </div>
                  )}
                </SessionCard>
              );
            })}
          </div>
        )}
      </section>

      {unrated.length > 0 ? (
        <section>
          <h2 className="text-xl">Waiting on your rating</h2>
          <p className="mt-2 text-sm text-muted">
            This is what the next student reads before deciding who to ask.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {unrated.map((session) => {
              const other =
                session.learner_id === user.id ? session.teacher_name : session.learner_name;
              return (
                <SessionCard key={session.id} session={session} viewerId={user.id}>
                  <RateForm sessionId={session.id} personName={other} />
                </SessionCard>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-xl">History</h2>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing here yet.</p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {past
              .filter((session) => !unratedIds.has(session.id))
              .map((session) => (
                <SessionCard key={session.id} session={session} viewerId={user.id} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
