import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CallRoom } from "@/components/call-room";
import { formatWhen } from "@/components/ui";
import { callWindow, hasTurn, iceServers, mintCallToken } from "@/lib/call-token";
import { getSessionById } from "@/lib/queries";
import { requireVerifiedUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Session call",
  robots: { index: false, follow: false },
};

export default async function CallPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireVerifiedUser(`/call/${sessionId}`);

  const session = getSessionById(sessionId);
  if (!session) notFound();

  // Only the two people in the session may ever open this room.
  const isParticipant = session.learner_id === user.id || session.teacher_id === user.id;
  if (!isParticipant) notFound();

  const asLearner = session.learner_id === user.id;
  const peerName = asLearner ? session.teacher_name : session.learner_name;

  if (session.status !== "accepted") {
    return (
      <Gate title="This call isn't open">
        <p>
          A call room only exists for a confirmed session. This one is{" "}
          <strong className="text-ink">{session.status}</strong>.
        </p>
        <Link href="/dashboard/sessions" className="btn btn-primary mt-6">
          Back to your sessions
        </Link>
      </Gate>
    );
  }

  const window = callWindow(session.scheduled_at, session.duration_minutes);
  if (!window.isOpen) {
    return (
      <Gate title={window.tooEarly ? "Not open yet" : "This call has closed"}>
        <p>
          {window.tooEarly ? (
            <>
              The room opens 15 minutes before you&apos;re due to meet —{" "}
              {formatWhen(session.scheduled_at)}.
            </>
          ) : (
            <>
              The room closes two hours after a session was due to end. If it never happened,
              cancel it and the credits go back to {asLearner ? "you" : session.learner_name}.
            </>
          )}
        </p>
        <Link href="/dashboard/sessions" className="btn btn-primary mt-6">
          Back to your sessions
        </Link>
      </Gate>
    );
  }

  const token = mintCallToken({ s: session.id, u: user.id, n: user.name });

  return (
    <div className="wrap">
      <CallRoom
        sessionId={session.id}
        token={token}
        iceServers={iceServers()}
        hasTurn={hasTurn()}
        selfName={user.name}
        peerName={peerName}
        skillName={session.skill_name}
        durationMinutes={session.duration_minutes}
        scheduledAt={session.scheduled_at}
      />
    </div>
  );
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap">
      <div className="mx-auto max-w-lg py-24 text-center">
        <h1 className="text-[2rem]">{title}</h1>
        <div className="mt-3 leading-relaxed text-muted">{children}</div>
      </div>
    </div>
  );
}
