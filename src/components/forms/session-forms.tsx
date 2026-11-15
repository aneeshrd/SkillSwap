"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  acceptRequestAction,
  cancelSessionAction,
  confirmSessionAction,
  declineRequestAction,
  rateSessionAction,
  requestSessionAction,
} from "@/app/actions/sessions";
import { RATING_TAGS, SESSION_DURATIONS } from "@/lib/constants";
import { emptyState } from "@/lib/forms";
import { Field, FormAlert, SubmitButton } from "./shared";

/* ------------------------------------------------------------ request form */
export function RequestSessionForm({
  teacherId,
  teacherName,
  skills,
  balance,
  preselectedSkillId,
}: {
  teacherId: string;
  teacherName: string;
  skills: { id: string; name: string }[];
  balance: number;
  preselectedSkillId?: string;
}) {
  const [state, action] = useActionState(requestSessionAction, emptyState);
  const [minutes, setMinutes] = useState(60);
  const [mode, setMode] = useState<"in_person" | "video">("in_person");

  const cost = SESSION_DURATIONS.find((d) => d.minutes === minutes)?.credits ?? 2;
  const affordable = balance >= cost;

  return (
    <form action={action} className="space-y-5">
      <FormAlert state={state} />
      <input type="hidden" name="teacher_id" value={teacherId} />

      <Field
        label="What do you want help with?"
        htmlFor="skill_id"
        error={state.fieldErrors?.skill_id}
      >
        <select
          id="skill_id"
          name="skill_id"
          className="select"
          defaultValue={preselectedSkillId ?? ""}
          required
        >
          <option value="" disabled>
            Pick one of {teacherName.split(" ")[0]}&apos;s skills
          </option>
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="label">How long?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SESSION_DURATIONS.map((option) => (
            <label
              key={option.minutes}
              className={`cursor-pointer rounded-md border px-3 py-2.5 text-center transition-colors ${
                minutes === option.minutes
                  ? "border-[var(--c-brand)] bg-[var(--c-brand-soft)]"
                  : "border-line hover:bg-surface"
              }`}
            >
              <input
                type="radio"
                name="duration_minutes"
                value={option.minutes}
                checked={minutes === option.minutes}
                onChange={() => setMinutes(option.minutes)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="nums block text-xs text-muted">
                {option.credits} credit{option.credits === 1 ? "" : "s"}
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.duration_minutes ? (
          <p className="field-error">{state.fieldErrors.duration_minutes}</p>
        ) : null}
      </fieldset>

      <Field
        label="When?"
        htmlFor="scheduled_at"
        hint="Pick a time that works for both of you — they can decline and suggest another."
        error={state.fieldErrors?.scheduled_at}
      >
        <input
          id="scheduled_at"
          name="scheduled_at"
          type="datetime-local"
          className="input"
          required
        />
      </Field>

      <fieldset>
        <legend className="label">Where?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "in_person", label: "In person" },
              { value: "video", label: "Video call" },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-md border px-3 py-2.5 text-center text-sm font-semibold transition-colors ${
                mode === option.value
                  ? "border-[var(--c-brand)] bg-[var(--c-brand-soft)]"
                  : "border-line hover:bg-surface"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label={mode === "in_person" ? "Which public place?" : "Call details (optional)"}
        htmlFor="location"
        hint={
          mode === "in_person"
            ? "Somewhere public on campus — a library, a study room, a cafe. Never a private home."
            : "Leave blank and you can share a link once it's accepted."
        }
        error={state.fieldErrors?.location}
      >
        <input
          id="location"
          name="location"
          className="input"
          placeholder={
            mode === "in_person" ? "Library, group study room 2B" : "We'll share a link"
          }
          required={mode === "in_person"}
        />
      </Field>

      <Field
        label="Anything they should know?"
        htmlFor="learner_message"
        hint="What you're stuck on, what you've already tried, what you're working towards."
        error={state.fieldErrors?.learner_message}
      >
        <textarea
          id="learner_message"
          name="learner_message"
          className="textarea"
          placeholder="I'm lost on the chain rule and my midterm is in a week…"
        />
      </Field>

      <div
        className={`flex items-center justify-between rounded-md px-4 py-3 text-sm ${
          affordable ? "bg-surface" : "notice notice-error"
        }`}
      >
        <span className={affordable ? "text-muted" : ""}>
          {affordable ? "This session costs" : "You don't have enough credits"}
        </span>
        <span className="nums font-display font-bold">
          {cost} credit{cost === 1 ? "" : "s"}
          <span className="font-sans font-normal text-muted"> · you have {balance}</span>
        </span>
      </div>

      {affordable ? (
        <SubmitButton className="btn btn-primary btn-lg w-full" pendingLabel="Sending request…">
          Send request
        </SubmitButton>
      ) : (
        <Link href="/browse?sort=match" className="btn btn-quiet btn-lg w-full">
          Earn credits by teaching
        </Link>
      )}

      <p className="hint text-center">
        Your {cost} credit{cost === 1 ? " is" : "s are"} held while {teacherName.split(" ")[0]}{" "}
        decides, and returned in full if they decline.
      </p>
    </form>
  );
}

/* --------------------------------------------------------- accept / decline */
export function AcceptForm({ sessionId }: { sessionId: string }) {
  const [state, action] = useActionState(acceptRequestAction, emptyState);
  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      <input type="hidden" name="session_id" value={sessionId} />
      <textarea
        name="teacher_note"
        className="textarea min-h-20"
        placeholder="Optional: anything they should bring or prepare."
      />
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Accepting…">
        Accept session
      </SubmitButton>
    </form>
  );
}

export function DeclineForm({ sessionId }: { sessionId: string }) {
  const [state, action] = useActionState(declineRequestAction, emptyState);
  return (
    <details className="group">
      <summary className="btn btn-ghost btn-sm w-full cursor-pointer list-none">
        Can&apos;t make it
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <FormAlert state={state} />
        <input type="hidden" name="session_id" value={sessionId} />
        <textarea
          name="reason"
          className="textarea min-h-20"
          placeholder="A short reason helps — &quot;I'm away that weekend, try me the week after?&quot;"
        />
        <SubmitButton className="btn btn-danger btn-sm w-full" pendingLabel="Declining…">
          Decline and return their credits
        </SubmitButton>
      </form>
    </details>
  );
}

/* ----------------------------------------------------------------- cancel */
export function CancelForm({ sessionId, label = "Cancel session" }: { sessionId: string; label?: string }) {
  const [state, action] = useActionState(cancelSessionAction, emptyState);
  return (
    <details>
      <summary className="btn btn-ghost btn-sm cursor-pointer list-none">{label}</summary>
      <form action={action} className="mt-3 space-y-3">
        <FormAlert state={state} />
        <input type="hidden" name="session_id" value={sessionId} />
        <textarea
          name="reason"
          className="textarea min-h-20"
          placeholder="Let them know why — it's the difference between a clash and a no-show."
        />
        <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Cancelling…">
          Confirm cancellation
        </SubmitButton>
      </form>
    </details>
  );
}

/* ---------------------------------------------------------------- confirm */
export function ConfirmForm({
  sessionId,
  alreadyConfirmed,
  waitingOnOther,
}: {
  sessionId: string;
  alreadyConfirmed: boolean;
  waitingOnOther: boolean;
}) {
  const [state, action] = useActionState(confirmSessionAction, emptyState);

  if (alreadyConfirmed) {
    return (
      <p className="notice notice-info">
        You&apos;ve confirmed this one.{" "}
        {waitingOnOther ? "Credits move as soon as the other person does too." : ""}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      <input type="hidden" name="session_id" value={sessionId} />
      <SubmitButton className="btn btn-primary btn-sm w-full" pendingLabel="Confirming…">
        Yes, this happened
      </SubmitButton>
    </form>
  );
}

/* ------------------------------------------------------------------ rating */
export function RateForm({
  sessionId,
  personName,
}: {
  sessionId: string;
  personName: string;
}) {
  const [state, action] = useActionState(rateSessionAction, emptyState);
  const [stars, setStars] = useState(0);

  if (state.ok) {
    return <p className="notice notice-ok">{state.message}</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <input type="hidden" name="session_id" value={sessionId} />

      <fieldset>
        <legend className="label">How was your session with {personName.split(" ")[0]}?</legend>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              aria-pressed={stars === n}
              className="rounded p-0.5"
            >
              <svg width="26" height="26" viewBox="0 0 24 24">
                <path
                  d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.44 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z"
                  fill={n <= stars ? "var(--c-credit-bright)" : "var(--c-line-strong)"}
                />
              </svg>
            </button>
          ))}
        </div>
        <input type="hidden" name="stars" value={stars || ""} />
        {state.fieldErrors?.stars ? <p className="field-error">{state.fieldErrors.stars}</p> : null}
      </fieldset>

      <fieldset>
        <legend className="label">What stood out? (optional)</legend>
        <div className="flex flex-wrap gap-1.5">
          {RATING_TAGS.map((tag) => (
            <label key={tag} className="cursor-pointer">
              <input type="checkbox" name="tags" value={tag} className="peer sr-only" />
              <span className="pill pill-outline peer-checked:border-[var(--c-brand)] peer-checked:bg-[var(--c-brand-soft)] peer-checked:text-[var(--c-brand)]">
                {tag}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <textarea
        name="comment"
        className="textarea min-h-20"
        placeholder="A sentence other students would find useful."
      />

      <SubmitButton className="btn btn-primary btn-sm" disabled={stars === 0} pendingLabel="Saving…">
        Leave rating
      </SubmitButton>
    </form>
  );
}
