import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "@/components/forms/auth-forms";
import { allowedEmailDomains } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join SkillSwap with your school email and start with two free time credits.",
};

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AuthShell
      title="Join the exchange"
      lead="Sign up with your school email. It takes a minute, and you'll start with two credits — one hour of learning, free."
    >
      <SignUpForm allowedDomains={allowedEmailDomains()} />
    </AuthShell>
  );
}
