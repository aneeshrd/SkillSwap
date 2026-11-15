import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE_NAME, userFromCookieValue } from "./auth";
import type { User } from "./types";

/** Cached per request, so several components can ask without re-querying. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  return userFromCookieValue(jar.get(SESSION_COOKIE_NAME)?.value);
});

export async function requireUser(returnTo = "/dashboard"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Unverified students can look around but cannot book or be booked. */
export async function requireVerifiedUser(returnTo = "/dashboard"): Promise<User> {
  const user = await requireUser(returnTo);
  if (user.verification_status !== "verified") redirect("/verify");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser("/admin");
  if (!user.is_admin) redirect("/dashboard");
  return user;
}
