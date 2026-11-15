"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ALLOWED_DURATIONS,
  InsufficientCredits,
  creditsForMinutes,
  postEntry,
} from "@/lib/credits";
import { getDb, newId, nowIso, transact } from "@/lib/db";
import { RATING_TAGS } from "@/lib/constants";
import { fieldErrorsFrom, str, type FormState } from "@/lib/forms";
import { getSessionById, isBlockedEitherWay, pendingBetween } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser, requireVerifiedUser } from "@/lib/session";
import type { SessionDetail } from "@/lib/types";

function notify(userId: string, kind: string, title: string, body: string, href: string): void {
  getDb()
    .prepare(
      `INSERT INTO notifications (id, user_id, kind, title, body, href, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(newId(), userId, kind, title, body, href, nowIso());
}

const requestSchema = z.object({
  teacher_id: z.string().min(1),
  skill_id: z.string().min(1, "Pick the skill you want help with"),
  duration_minutes: z.coerce
    .number()
    .refine((n) => (ALLOWED_DURATIONS as readonly number[]).includes(n), "Choose a session length"),
  scheduled_at: z.string().min(1, "Pick a date and time"),
  mode: z.enum(["in_person", "video"]),
  location: z.string().max(160),
  learner_message: z.string().max(600, "Keep your message under 600 characters"),
});

export async function requestSessionAction(_prev: FormState, data: FormData): Promise<FormState> {
  const learner = await requireVerifiedUser("/browse");

  const parsed = requestSchema.safeParse({
    teacher_id: str(data, "teacher_id"),
    skill_id: str(data, "skill_id"),
    duration_minutes: str(data, "duration_minutes"),
    scheduled_at: str(data, "scheduled_at"),
    mode: str(data, "mode") || "in_person",
    location: str(data, "location"),
    learner_message: str(data, "learner_message"),
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const input = parsed.data;
  const db = getDb();

  if (input.teacher_id === learner.id) {
    return { error: "You can't book a session with yourself." };
  }

  const limit = rateLimit(`request:${learner.id}`, 12, 3600);
  if (!limit.ok) {
    return { error: `You've sent a lot of requests. Try again in ${limit.retryAfter} seconds.` };
  }

  const teacher = db
    .prepare(
      `SELECT id, name, handle, verification_status, is_suspended FROM users WHERE id = ?`
    )
    .get(input.teacher_id) as
    | { id: string; name: string; handle: string; verification_status: string; is_suspended: number }
    | undefined;

  if (!teacher || teacher.is_suspended) return { error: "That student isn't available right now." };
  if (teacher.verification_status !== "verified") {
    return { error: "That student hasn't finished verifying their school email yet." };
  }
  if (isBlockedEitherWay(learner.id, teacher.id)) {
    return { error: "You can't request a session with this student." };
  }
  if (
    !db
      .prepare(`SELECT 1 FROM user_skills WHERE user_id = ? AND skill_id = ? AND kind = 'teach'`)
      .get(teacher.id, input.skill_id)
  ) {
    return { fieldErrors: { skill_id: `${teacher.name} doesn't list that skill as something they teach.` } };
  }
  if (pendingBetween(learner.id, teacher.id) >= 3) {
    return { error: `You already have three open sessions with ${teacher.name}. Wrap one up first.` };
  }

  const when = new Date(input.scheduled_at);
  if (Number.isNaN(when.getTime())) {
    return { fieldErrors: { scheduled_at: "That date doesn't look right." } };
  }
  if (when.getTime() < Date.now() + 30 * 60_000) {
    return { fieldErrors: { scheduled_at: "Pick a time at least 30 minutes from now." } };
  }
  if (when.getTime() > Date.now() + 60 * 86_400_000) {
    return { fieldErrors: { scheduled_at: "Pick a time within the next 60 days." } };
  }
  if (input.mode === "in_person" && input.location.length < 3) {
    return { fieldErrors: { location: "Name a public place on campus — a library, a study room, a cafe." } };
  }

  const credits = creditsForMinutes(input.duration_minutes);
  const sessionId = newId();
  const now = nowIso();

  try {
    transact((tx) => {
      tx.prepare(
        `INSERT INTO sessions
          (id, learner_id, teacher_id, skill_id, status, duration_minutes, credits,
           scheduled_at, mode, location, learner_message, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sessionId,
        learner.id,
        teacher.id,
        input.skill_id,
        input.duration_minutes,
        credits,
        when.toISOString(),
        input.mode,
        input.location,
        input.learner_message,
        now,
        now
      );

      // Credits are held the moment the request is sent, so nobody can promise
      // the same credit to two people.
      postEntry(tx, {
        userId: learner.id,
        delta: -credits,
        reason: "session_hold",
        sessionId,
        note: "Held while your request is pending",
      });
    });
  } catch (error) {
    if (error instanceof InsufficientCredits) {
      return {
        error: `You need ${error.needed} credit${error.needed === 1 ? "" : "s"} for that session and you have ${error.balance}. Teach a session to earn more.`,
      };
    }
    throw error;
  }

  const skill = db.prepare(`SELECT name FROM skills WHERE id = ?`).get(input.skill_id) as
    | { name: string }
    | undefined;

  notify(
    teacher.id,
    "session_request",
    `${learner.name} asked for help with ${skill?.name ?? "a skill"}`,
    `${credits} credit${credits === 1 ? "" : "s"} · ${input.duration_minutes} minutes`,
    "/dashboard/requests"
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/requests");
  redirect("/dashboard/requests?sent=1");
}

/** Loads a session and checks the signed-in user is one of its two people. */
async function loadParticipantSession(
  sessionId: string,
  role: "teacher" | "learner" | "either"
): Promise<{ session: SessionDetail; userId: string } | { error: string }> {
  const user = await requireUser("/dashboard/requests");
  const session = getSessionById(sessionId);
  if (!session) return { error: "That session no longer exists." };

  const isTeacher = session.teacher_id === user.id;
  const isLearner = session.learner_id === user.id;
  if (!isTeacher && !isLearner) return { error: "That isn't your session." };
  if (role === "teacher" && !isTeacher) return { error: "Only the teacher can do that." };
  if (role === "learner" && !isLearner) return { error: "Only the learner can do that." };

  return { session, userId: user.id };
}

export async function acceptRequestAction(_prev: FormState, data: FormData): Promise<FormState> {
  const loaded = await loadParticipantSession(str(data, "session_id"), "teacher");
  if ("error" in loaded) return loaded;
  const { session } = loaded;

  if (session.status !== "pending") return { error: "That request has already been answered." };

  const now = nowIso();
  getDb()
    .prepare(`UPDATE sessions SET status = 'accepted', teacher_note = ?, updated_at = ? WHERE id = ?`)
    .run(str(data, "teacher_note").slice(0, 600), now, session.id);

  notify(
    session.learner_id,
    "session_accepted",
    `${session.teacher_name} accepted your session`,
    `${session.skill_name} · ${new Date(session.scheduled_at).toLocaleString()}`,
    "/dashboard/sessions"
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/requests");
  revalidatePath("/dashboard/sessions");
  return { ok: true, message: "Accepted. It's on your upcoming list." };
}

export async function declineRequestAction(_prev: FormState, data: FormData): Promise<FormState> {
  const loaded = await loadParticipantSession(str(data, "session_id"), "teacher");
  if ("error" in loaded) return loaded;
  const { session } = loaded;

  if (session.status !== "pending") return { error: "That request has already been answered." };

  const reason = str(data, "reason").slice(0, 300);
  const now = nowIso();

  transact((tx) => {
    tx.prepare(
      `UPDATE sessions SET status = 'declined', cancel_reason = ?, updated_at = ? WHERE id = ?`
    ).run(reason, now, session.id);

    postEntry(tx, {
      userId: session.learner_id,
      delta: session.credits,
      reason: "hold_released",
      sessionId: session.id,
      note: "Request declined — credits returned",
    });
  });

  notify(
    session.learner_id,
    "session_declined",
    `${session.teacher_name} can't make that session`,
    `Your ${session.credits} credit${session.credits === 1 ? "" : "s"} went straight back to your balance.`,
    "/browse"
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/requests");
  return { ok: true, message: "Declined, and their credits were returned." };
}

export async function cancelSessionAction(_prev: FormState, data: FormData): Promise<FormState> {
  const loaded = await loadParticipantSession(str(data, "session_id"), "either");
  if ("error" in loaded) return loaded;
  const { session, userId } = loaded;

  if (!["pending", "accepted"].includes(session.status)) {
    return { error: "That session can't be cancelled any more." };
  }

  const reason = str(data, "reason").slice(0, 300);
  const now = nowIso();

  transact((tx) => {
    tx.prepare(
      `UPDATE sessions SET status = 'cancelled', cancelled_by = ?, cancel_reason = ?, updated_at = ?
        WHERE id = ?`
    ).run(userId, reason, now, session.id);

    postEntry(tx, {
      userId: session.learner_id,
      delta: session.credits,
      reason: "hold_released",
      sessionId: session.id,
      note: "Session cancelled — credits returned",
    });
  });

  const otherId = userId === session.learner_id ? session.teacher_id : session.learner_id;
  const whoCancelled = userId === session.learner_id ? session.learner_name : session.teacher_name;
  notify(
    otherId,
    "session_cancelled",
    `${whoCancelled} cancelled your ${session.skill_name} session`,
    reason || "No reason given.",
    "/dashboard/sessions"
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/sessions");
  revalidatePath("/dashboard/requests");
  return { ok: true, message: "Cancelled. Credits were returned to the learner." };
}

/**
 * Both people confirm a session happened. The teacher is paid on the second
 * confirmation — so a single party can never move credits on their own.
 */
export async function confirmSessionAction(_prev: FormState, data: FormData): Promise<FormState> {
  const loaded = await loadParticipantSession(str(data, "session_id"), "either");
  if ("error" in loaded) return loaded;
  const { session, userId } = loaded;

  if (session.status !== "accepted") {
    return { error: "Only an accepted session can be marked as done." };
  }
  if (new Date(session.scheduled_at).getTime() > Date.now()) {
    return { error: "You can confirm this once the session has started." };
  }

  const isLearner = userId === session.learner_id;
  const column = isLearner ? "learner_confirmed_at" : "teacher_confirmed_at";
  if (session[column as "learner_confirmed_at" | "teacher_confirmed_at"]) {
    return { ok: true, message: "You already confirmed this one." };
  }

  const now = nowIso();
  const otherConfirmed = isLearner ? session.teacher_confirmed_at : session.learner_confirmed_at;

  transact((tx) => {
    tx.prepare(`UPDATE sessions SET ${column} = ?, updated_at = ? WHERE id = ?`).run(
      now,
      now,
      session.id
    );

    if (otherConfirmed) {
      tx.prepare(
        `UPDATE sessions SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`
      ).run(now, now, session.id);

      // The learner's credits were already held at request time; this is the
      // other half of the transfer.
      postEntry(tx, {
        userId: session.teacher_id,
        delta: session.credits,
        reason: "session_earned",
        sessionId: session.id,
        note: `Taught ${session.skill_name} to ${session.learner_name}`,
      });
    }
  });

  if (otherConfirmed) {
    notify(
      session.teacher_id,
      "credits_earned",
      `+${session.credits} credit${session.credits === 1 ? "" : "s"} for teaching ${session.skill_name}`,
      "Both of you confirmed the session. Spend them whenever you like.",
      "/dashboard/wallet"
    );
    notify(
      session.learner_id,
      "session_completed",
      `Your ${session.skill_name} session is complete`,
      `Leave ${session.teacher_name} a rating so other students know what to expect.`,
      "/dashboard/sessions"
    );
  } else {
    const otherId = isLearner ? session.teacher_id : session.learner_id;
    notify(
      otherId,
      "confirm_needed",
      `Confirm your ${session.skill_name} session`,
      "Your partner says it happened. Confirm and the credits move across.",
      "/dashboard/sessions"
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/sessions");
  revalidatePath("/dashboard/wallet");
  return {
    ok: true,
    message: otherConfirmed
      ? "Confirmed by both of you — credits transferred."
      : "Confirmed. Waiting on the other person.",
  };
}

export async function rateSessionAction(_prev: FormState, data: FormData): Promise<FormState> {
  const loaded = await loadParticipantSession(str(data, "session_id"), "either");
  if ("error" in loaded) return loaded;
  const { session, userId } = loaded;

  if (session.status !== "completed") {
    return { error: "You can rate a session once it's complete." };
  }

  const stars = Number(str(data, "stars"));
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { fieldErrors: { stars: "Pick between 1 and 5 stars." } };
  }

  const tags = data
    .getAll("tags")
    .map((t) => String(t))
    .filter((t) => (RATING_TAGS as readonly string[]).includes(t))
    .slice(0, 4);

  const rateeId = userId === session.learner_id ? session.teacher_id : session.learner_id;

  try {
    getDb()
      .prepare(
        `INSERT INTO ratings (id, session_id, rater_id, ratee_id, stars, comment, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newId(),
        session.id,
        userId,
        rateeId,
        stars,
        str(data, "comment").slice(0, 600),
        tags.join(","),
        nowIso()
      );
  } catch {
    return { error: "You've already rated this session." };
  }

  revalidatePath("/dashboard/sessions");
  revalidatePath(`/u/${session.teacher_handle}`);
  revalidatePath(`/u/${session.learner_handle}`);
  return { ok: true, message: "Thanks — your rating is on their profile." };
}
