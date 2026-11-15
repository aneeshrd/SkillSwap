"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { revokeAllSessionsFor } from "@/lib/auth";
import { postEntry } from "@/lib/credits";
import { getDb, newId, nowIso, transact } from "@/lib/db";
import { fieldErrorsFrom, str, type FormState } from "@/lib/forms";
import { requireAdmin } from "@/lib/session";

function audit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  detail = ""
): void {
  getDb()
    .prepare(
      `INSERT INTO admin_audit (id, admin_id, action, target_type, target_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(newId(), adminId, action, targetType, targetId, detail, nowIso());
}

export async function resolveReportAction(_prev: FormState, data: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const reportId = str(data, "report_id");
  const status = str(data, "status");
  if (!["reviewing", "resolved", "dismissed"].includes(status)) {
    return { error: "Unknown status." };
  }

  const note = str(data, "resolution_note").slice(0, 1000);
  const now = nowIso();

  getDb()
    .prepare(
      `UPDATE reports SET status = ?, resolution_note = ?, handled_by = ?, handled_at = ?
        WHERE id = ?`
    )
    .run(status, note, admin.id, now, reportId);

  audit(admin.id, `report_${status}`, "report", reportId, note);
  revalidatePath("/admin");
  return { ok: true, message: `Report marked ${status}.` };
}

const suspendSchema = z.object({
  user_id: z.string().min(1),
  reason: z.string().min(5, "Record why — this is an audited action").max(500),
});

export async function suspendUserAction(_prev: FormState, data: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = suspendSchema.safeParse({
    user_id: str(data, "user_id"),
    reason: str(data, "reason"),
  });
  if (!parsed.success) {
    return { error: "A reason is required.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { user_id, reason } = parsed.data;
  if (user_id === admin.id) return { error: "You can't suspend your own account." };

  const db = getDb();
  db.prepare(
    `UPDATE users SET is_suspended = 1, suspension_reason = ?, updated_at = ? WHERE id = ?`
  ).run(reason, nowIso(), user_id);

  // Kill their live logins immediately.
  revokeAllSessionsFor(user_id);

  audit(admin.id, "user_suspended", "user", user_id, reason);
  revalidatePath("/admin");
  revalidatePath("/browse");
  return { ok: true, message: "Account suspended and signed out everywhere." };
}

export async function reinstateUserAction(_prev: FormState, data: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = str(data, "user_id");

  getDb()
    .prepare(`UPDATE users SET is_suspended = 0, suspension_reason = NULL, updated_at = ? WHERE id = ?`)
    .run(nowIso(), userId);

  audit(admin.id, "user_reinstated", "user", userId, str(data, "reason").slice(0, 500));
  revalidatePath("/admin");
  return { ok: true, message: "Account reinstated." };
}

export async function manualVerifyAction(_prev: FormState, data: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = str(data, "user_id");
  const decision = str(data, "decision");
  if (!["verified", "rejected"].includes(decision)) return { error: "Unknown decision." };

  const now = nowIso();
  getDb()
    .prepare(
      `UPDATE users SET verification_status = ?, verified_at = ?, updated_at = ? WHERE id = ?`
    )
    .run(decision, decision === "verified" ? now : null, now, userId);

  audit(admin.id, `verification_${decision}`, "user", userId, str(data, "note").slice(0, 500));
  revalidatePath("/admin");
  return { ok: true, message: `Student marked ${decision}.` };
}

const adjustSchema = z.object({
  user_id: z.string().min(1),
  delta: z.coerce
    .number()
    .int("Whole credits only")
    .refine((n) => n !== 0, "Enter a non-zero amount")
    .refine((n) => Math.abs(n) <= 40, "Keep corrections under 40 credits"),
  note: z.string().min(5, "Record why — this is an audited action").max(500),
});

/**
 * Moderator credit correction, e.g. refunding a learner after a no-show.
 * Allowed to push a balance negative so a reversal is always possible.
 */
export async function adjustCreditsAction(_prev: FormState, data: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = adjustSchema.safeParse({
    user_id: str(data, "user_id"),
    delta: str(data, "delta"),
    note: str(data, "note"),
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { user_id, delta, note } = parsed.data;

  transact((tx) => {
    postEntry(tx, {
      userId: user_id,
      delta,
      reason: "admin_adjustment",
      note,
      allowNegative: true,
    });
  });

  audit(admin.id, "credits_adjusted", "user", user_id, `${delta > 0 ? "+" : ""}${delta}: ${note}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard/wallet");
  return { ok: true, message: `Adjusted by ${delta > 0 ? "+" : ""}${delta} credits.` };
}
