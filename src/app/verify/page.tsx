import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { VerifyForm } from "@/components/forms/auth-forms";
import { mailIsSimulated } from "@/lib/email";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Verify your school email",
  description: "Confirm your student email address to start swapping skills.",
};

export default async function VerifyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.verification_status === "verified") redirect("/dashboard");

  return (
    <AuthShell
      title="Check your school inbox"
      lead={`We sent a 6-digit code to ${user.email}. Entering it confirms you're a student — and releases your two welcome credits.`}
      aside={
        <>
          <p className="eyebrow eyebrow-on-ink">Why we ask</p>
          <p
            className="mt-5 font-display text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em]"
            style={{ color: "var(--c-on-ink)" }}
          >
            One check keeps the open internet out.
          </p>
          <p
            className="mt-5 text-sm leading-relaxed"
            style={{ color: "var(--c-on-ink-muted)" }}
          >
            A school email proves you belong to a campus community — not who you are. We pair it
            with two-sided session confirmation, ratings and a moderation queue, because no single
            check is enough on its own.
          </p>
          <p className="mt-6 text-sm leading-relaxed" style={{ color: "var(--c-on-ink-muted)" }}>
            Until you verify you can browse SkillSwap, but you can&apos;t request a session or be
            booked by anyone.
          </p>
        </>
      }
    >
      <VerifyForm devHint={mailIsSimulated()} />
    </AuthShell>
  );
}
