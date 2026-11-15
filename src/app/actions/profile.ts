"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, newId, nowIso } from "@/lib/db";
import { fieldErrorsFrom, str, type FormState } from "@/lib/forms";
import { requireUser } from "@/lib/session";

const profileSchema = z.object({
  name: z.string().min(2, "Tell us your name").max(60),
  bio: z.string().max(600, "Keep it under 600 characters"),
  year: z.string().max(40),
  avatar_emoji: z.string().max(8),
});

export async function updateProfileAction(_prev: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/profile");
  const parsed = profileSchema.safeParse({
    name: str(data, "name"),
    bio: str(data, "bio"),
    year: str(data, "year"),
    avatar_emoji: str(data, "avatar_emoji") || user.avatar_emoji,
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { name, bio, year, avatar_emoji } = parsed.data;
  getDb()
    .prepare(
      `UPDATE users SET name = ?, bio = ?, year = ?, avatar_emoji = ?, updated_at = ?
        WHERE id = ?`
    )
    .run(name, bio, year || null, avatar_emoji.slice(0, 8), nowIso(), user.id);

  revalidatePath("/dashboard/profile");
  revalidatePath(`/u/${user.handle}`);
  return { ok: true, message: "Profile saved." };
}

const skillSchema = z.object({
  skill_id: z.string().min(1, "Pick a skill"),
  kind: z.enum(["teach", "learn"]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  note: z.string().max(200, "Keep the note short"),
});

export async function addSkillAction(_prev: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/profile");
  const parsed = skillSchema.safeParse({
    skill_id: str(data, "skill_id"),
    kind: str(data, "kind"),
    level: str(data, "level") || "intermediate",
    note: str(data, "note"),
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { skill_id, kind, level, note } = parsed.data;
  const db = getDb();

  if (!db.prepare(`SELECT 1 FROM skills WHERE id = ?`).get(skill_id)) {
    return { error: "That skill no longer exists." };
  }

  const count = db
    .prepare(`SELECT COUNT(*) AS n FROM user_skills WHERE user_id = ? AND kind = ?`)
    .get(user.id, kind) as { n: number };
  if (count.n >= 12) {
    return {
      error:
        kind === "teach"
          ? "Twelve skills is plenty to offer. Remove one first."
          : "Twelve learning goals is plenty. Remove one first.",
    };
  }

  try {
    db.prepare(
      `INSERT INTO user_skills (id, user_id, skill_id, kind, level, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(newId(), user.id, skill_id, kind, level, note, nowIso());
  } catch {
    return { error: "That skill is already on your profile." };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/u/${user.handle}`);
  return { ok: true, message: kind === "teach" ? "Added to what you teach." : "Added to what you want to learn." };
}

export async function removeSkillAction(data: FormData): Promise<void> {
  const user = await requireUser("/dashboard/profile");
  const id = str(data, "user_skill_id");
  getDb().prepare(`DELETE FROM user_skills WHERE id = ? AND user_id = ?`).run(id, user.id);
  revalidatePath("/dashboard/profile");
  revalidatePath(`/u/${user.handle}`);
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function setAvailabilityAction(_prev: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/profile");
  const db = getDb();

  const blocks: { weekday: number; start: number; end: number }[] = [];
  for (let day = 0; day < 7; day += 1) {
    if (str(data, `day_${day}`) !== "on") continue;
    const start = Number(str(data, `start_${day}`) || "0");
    const end = Number(str(data, `end_${day}`) || "0");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return { error: `${DAY_LABELS[day]}: the end time must be after the start time.` };
    }
    blocks.push({ weekday: day, start, end });
  }

  const write = db.transaction(() => {
    db.prepare(`DELETE FROM availability WHERE user_id = ?`).run(user.id);
    const insert = db.prepare(
      `INSERT INTO availability (id, user_id, weekday, start_minute, end_minute)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const block of blocks) insert.run(newId(), user.id, block.weekday, block.start, block.end);
  });
  write();

  revalidatePath("/dashboard/profile");
  revalidatePath(`/u/${user.handle}`);
  return { ok: true, message: blocks.length ? "Availability saved." : "Availability cleared." };
}
