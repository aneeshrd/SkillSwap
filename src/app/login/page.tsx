import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LogInForm } from "@/components/forms/auth-forms";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to SkillSwap.",
};

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;

  // Only allow same-site redirects.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <AuthShell
      title="Welcome back"
      lead="Log in to see your requests, your upcoming sessions and your credit balance."
    >
      <LogInForm next={safeNext} />
    </AuthShell>
  );
}
