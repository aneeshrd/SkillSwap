import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { getIncomingRequests, getUnratedSessions } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { settleStaleSessions } from "@/lib/sweep";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  // Returns credits held by requests nobody answered and sessions nobody
  // confirmed. Idempotent; move this to an hourly cron for a real deployment.
  settleStaleSessions();

  const badges: Record<string, number> = {
    "/dashboard/requests": getIncomingRequests(user.id).length,
    "/dashboard/sessions": getUnratedSessions(user.id).length,
  };

  return (
    <div className="wrap py-10 lg:py-12">
      {user.verification_status !== "verified" ? (
        <p className="notice notice-credit mb-7">
          <strong>Your school email isn&apos;t confirmed yet.</strong> You can look around, but you
          can&apos;t request a session or be booked until you verify — and your two welcome credits
          are waiting.{" "}
          <Link href="/verify" className="font-bold underline underline-offset-2">
            Enter your code
          </Link>
        </p>
      ) : null}

      <DashboardNav badges={badges} />
      <div className="pt-9">{children}</div>
    </div>
  );
}
