"use server";

import { revalidatePath } from "next/cache";
import { getDb, nowIso } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function markNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  getDb()
    .prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`)
    .run(nowIso(), user.id);
  revalidatePath("/dashboard");
}
