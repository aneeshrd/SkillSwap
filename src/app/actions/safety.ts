"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { REPORT_CATEGORIES } from "@/lib/constants";
import { getDb, newId, nowIso } from "@/lib/db";
import { fieldErrorsFrom, str, type FormState } from "@/lib/forms";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";

const CATEGORY_VALUES = REPORT_CATEGORIES.map((c) => c.value) as [string, ...string[]];

const reportSchema = z.object({
  reported_user_id: z.string().min(1),
  session_id: z.string().optional(),
  category: z.enum(CATEGORY_VALUES, { message: "Pick what happened" }),
  details: z.string().min(10, "Give us a sentence or two so a moderator can act").max(1500),
});

export async function reportUserAction(_prev: FormState, data: FormData): Promise<FormState> {
  const reporter = await requireUser();

  const parsed = reportSchema.safeParse({
    reported_user_id: str(data, "reported_user_id"),
    session_id: str(data, "session_id") || undefined,
    category: str(data, "category"),
    details: str(data, "details"),
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const input = parsed.data;
  if (input.reported_user_id === reporter.id) {
    return { error: "You can't report yourself." };
  }

  const limit = rateLimit(`report:${reporter.id}`, 6, 86_400);
  if (!limit.ok) {
    return { error: "You've filed several reports today. A moderator will be in touch." };
  }

  const db = getDb();
  if (!db.prepare(`SELECT 1 FROM users WHERE id = ?`).get(input.reported_user_id)) {
    return { error: "That student no longer exists." };
  }

  db.prepare(
    `INSERT INTO reports
       (id, reporter_id, reported_user_id, session_id, category, details, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`
  ).run(
    newId(),
    reporter.id,
    input.reported_user_id,
    input.session_id ?? null,
    input.category,
    input.details,
    nowIso()
  );

  revalidatePath("/admin");
  return {
    ok: true,
    message:
      "Report filed. A SkillSwap moderator reviews every report, and we won't tell the other student who reported them.",
  };
}

export async function blockUserAction(_prev: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser();
  const target = str(data, "user_id");
  if (!target || target === user.id) return { error: "That isn't a student you can block." };

  try {
    getDb()
      .prepare(`INSERT INTO blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)`)
      .run(newId(), user.id, target, nowIso());
  } catch {
    return { ok: true, message: "You've already blocked them." };
  }

  revalidatePath("/browse");
  revalidatePath("/dashboard/safety");
  return { ok: true, message: "Blocked. You won't see each other on SkillSwap." };
}

export async function unblockUserAction(data: FormData): Promise<void> {
  const user = await requireUser();
  getDb()
    .prepare(`DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`)
    .run(user.id, str(data, "user_id"));
  revalidatePath("/dashboard/safety");
}
