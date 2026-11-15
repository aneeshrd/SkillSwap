"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  SESSION_COOKIE_NAME,
  allowedEmailDomains,
  consumeVerificationCode,
  createVerificationCode,
  emailDomain,
  hashPassword,
  isAdminEmail,
  isAllowedSchoolEmail,
  issueSessionCookie,
  revokeSessionCookie,
  uniqueHandle,
  verifyPassword,
} from "@/lib/auth";
import { SCHOOL_YEARS } from "@/lib/constants";
import { grantSignupBonus } from "@/lib/credits";
import { getDb, newId, nowIso } from "@/lib/db";
import { sendVerificationCode } from "@/lib/email";
import { fieldErrorsFrom, str, type FormState } from "@/lib/forms";
import { getUserByEmail } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

const signUpSchema = z.object({
  name: z.string().min(2, "Tell us your name").max(60, "That name is too long"),
  email: z.string().email("That doesn't look like an email address").max(160),
  password: z.string().min(10, "Use at least 10 characters").max(200),
  year: z.enum(SCHOOL_YEARS).optional(),
  terms: z.literal("on", { message: "Please accept the community guidelines" }),
});

async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || "local";
}

function schoolIdForDomain(domain: string): string | null {
  const rows = getDb().prepare(`SELECT id, email_domains FROM schools`).all() as {
    id: string;
    email_domains: string;
  }[];
  for (const row of rows) {
    const domains = row.email_domains.split(",").map((d) => d.trim().toLowerCase());
    if (domains.some((d) => domain === d || domain.endsWith(`.${d}`))) return row.id;
  }
  return null;
}

export async function signUpAction(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: str(data, "name"),
    email: str(data, "email").toLowerCase(),
    password: str(data, "password"),
    year: str(data, "year") || undefined,
    terms: str(data, "terms"),
  });

  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { name, email, password, year } = parsed.data;

  const limit = rateLimit(`signup:${await clientKey()}`, 8, 3600);
  if (!limit.ok) {
    return { error: `Too many signup attempts. Try again in ${limit.retryAfter} seconds.` };
  }

  if (!isAllowedSchoolEmail(email)) {
    const domains = allowedEmailDomains();
    return {
      error: "SkillSwap is open to students only.",
      fieldErrors: {
        email: `Use your school address${domains.length ? ` (${domains.slice(0, 3).join(", ")})` : ""}.`,
      },
    };
  }

  if (getUserByEmail(email)) {
    return { fieldErrors: { email: "That email is already registered. Try logging in." } };
  }

  const domain = emailDomain(email);
  const now = nowIso();
  const id = newId();

  getDb()
    .prepare(
      `INSERT INTO users
        (id, handle, name, email, email_domain, password_hash, school_id, year,
         bio, avatar_emoji, verification_status, is_admin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, 'unverified', ?, ?, ?)`
    )
    .run(
      id,
      uniqueHandle(name),
      name,
      email,
      domain,
      hashPassword(password),
      schoolIdForDomain(domain),
      year ?? null,
      name.slice(0, 2).toUpperCase(),
      isAdminEmail(email) ? 1 : 0,
      now,
      now
    );

  // A mail failure must not strand a created account: the session is issued
  // either way and /verify offers a resend.
  const sent = await sendVerificationCode(email, name, createVerificationCode(id));
  if (!sent.ok) {
    console.error(`Verification mail to ${email} failed: ${sent.error}`);
  }

  const cookie = issueSessionCookie(id);
  (await cookies()).set(cookie.name, cookie.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookie.maxAge,
  });

  redirect("/verify");
}

const loginSchema = z.object({
  email: z.string().email("Enter your school email").max(160),
  password: z.string().min(1, "Enter your password").max(200),
});

export async function logInAction(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: str(data, "email").toLowerCase(),
    password: str(data, "password"),
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const next = str(data, "next") || "/dashboard";
  const { email, password } = parsed.data;

  const limit = rateLimit(`login:${email}:${await clientKey()}`, 10, 900);
  if (!limit.ok) {
    return { error: `Too many attempts. Try again in ${limit.retryAfter} seconds.` };
  }

  const user = getUserByEmail(email);
  // Same message either way: don't confirm whether an address is registered.
  const generic = { error: "Email or password is incorrect." };
  if (!user || !verifyPassword(password, user.password_hash)) return generic;

  if (user.is_suspended) {
    return {
      error:
        "This account is suspended. Email the SkillSwap moderators from your school address to appeal.",
    };
  }

  const cookie = issueSessionCookie(user.id);
  (await cookies()).set(cookie.name, cookie.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookie.maxAge,
  });

  redirect(user.verification_status === "verified" ? next : "/verify");
}

export async function logOutAction(): Promise<void> {
  const jar = await cookies();
  revokeSessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
  jar.delete(SESSION_COOKIE_NAME);
  redirect("/");
}

export async function verifyCodeAction(_prev: FormState, data: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.verification_status === "verified") redirect("/dashboard");

  const code = str(data, "code").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { fieldErrors: { code: "Enter the 6-digit code from your email." } };
  }

  const limit = rateLimit(`verify:${user.id}`, 12, 900);
  if (!limit.ok) return { error: `Too many tries. Wait ${limit.retryAfter} seconds.` };

  const outcome = consumeVerificationCode(user.id, code);
  if (!outcome.ok) {
    const messages: Record<string, string> = {
      no_code: "That code has expired. Send yourself a new one.",
      expired: "That code has expired. Send yourself a new one.",
      too_many_attempts: "Too many wrong attempts. Request a fresh code.",
      mismatch: "That code doesn't match. Check your email and try again.",
    };
    return { fieldErrors: { code: messages[outcome.error] } };
  }

  grantSignupBonus(user.id);
  getDb()
    .prepare(
      `INSERT INTO notifications (id, user_id, kind, title, body, href, created_at)
       VALUES (?, ?, 'welcome', ?, ?, '/browse', ?)`
    )
    .run(
      newId(),
      user.id,
      "You're verified — 2 credits added",
      "That's one hour of learning, on the community. Spend it whenever you like.",
      nowIso()
    );

  redirect("/dashboard?welcome=1");
}

export async function resendCodeAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.verification_status === "verified") redirect("/dashboard");

  const limit = rateLimit(`resend:${user.id}`, 4, 900);
  if (!limit.ok) {
    return { error: `Hold on — you can request another code in ${limit.retryAfter} seconds.` };
  }

  const sent = await sendVerificationCode(user.email, user.name, createVerificationCode(user.id));
  if (!sent.ok) {
    return {
      error: `We couldn't send that email just now (${sent.error}) Try again in a minute, or ask a moderator to verify you by hand.`,
    };
  }
  return { ok: true, message: "New code sent. Check your school inbox." };
}
