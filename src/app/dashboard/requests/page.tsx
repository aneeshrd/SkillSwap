import type { Metadata } from "next";
import Link from "next/link";
import { AcceptForm, CancelForm, DeclineForm } from "@/components/forms/session-forms";
import { SessionCard } from "@/components/session-card";
import { EmptyState } from "@/components/ui";
import { getIncomingRequests, getOutgoingRequests } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Session requests" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  const user = await requireUser("/dashboard/requests");

  const incoming = getIncomingRequests(user.id);
  const outgoing = getOutgoingRequests(user.id);

  return (
    <div className="space-y-12">
      {sent ? (
        <p className="notice notice-ok">
          Request sent. Your credits are held until they answer — and returned in full if they
          can&apos;t make it.
        </p>
      ) : null}

      <section>
        <h1 className="text-[1.875rem]">Requests to you</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Someone has put credits on hold to learn from you. Answering quickly — either way — is
          the single most useful thing you can do here.
        </p>

        {incoming.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="·"
              title="No requests right now"
              body="Students find you through the skills on your profile. A clear note on each skill makes a real difference."
              action={
                <Link href="/dashboard/profile" className="btn btn-ghost">
                  Review my skills
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {incoming.map((session) => (
              <SessionCard key={session.id} session={session} viewerId={user.id}>
                <div className="space-y-3">
                  <AcceptForm sessionId={session.id} />
                  <DeclineForm sessionId={session.id} />
                </div>
              </SessionCard>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl">Your requests, waiting on a reply</h2>

        {outgoing.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nothing pending.{" "}
            <Link href="/browse" className="link">
              Find someone to learn from
            </Link>
            .
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {outgoing.map((session) => (
              <SessionCard key={session.id} session={session} viewerId={user.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    {session.credits} credit{session.credits === 1 ? "" : "s"} held until they
                    answer.
                  </p>
                  <CancelForm sessionId={session.id} label="Withdraw request" />
                </div>
              </SessionCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
