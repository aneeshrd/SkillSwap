"use client";

import { useActionState } from "react";
import { blockUserAction, reportUserAction } from "@/app/actions/safety";
import { REPORT_CATEGORIES } from "@/lib/constants";
import { emptyState } from "@/lib/forms";
import { Field, FormAlert, SubmitButton } from "./shared";

export function ReportForm({
  reportedUserId,
  personName,
  sessionId,
}: {
  reportedUserId: string;
  personName: string;
  sessionId?: string;
}) {
  const [state, action] = useActionState(reportUserAction, emptyState);

  if (state.ok) return <p className="notice notice-ok">{state.message}</p>;

  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <input type="hidden" name="reported_user_id" value={reportedUserId} />
      {sessionId ? <input type="hidden" name="session_id" value={sessionId} /> : null}

      <Field label="What happened?" htmlFor="category" error={state.fieldErrors?.category}>
        <select id="category" name="category" className="select" defaultValue="" required>
          <option value="" disabled>
            Choose one
          </option>
          {REPORT_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Tell a moderator what to look at"
        htmlFor="details"
        hint={`${personName} is never told who reported them.`}
        error={state.fieldErrors?.details}
      >
        <textarea id="details" name="details" className="textarea" required minLength={10} />
      </Field>

      <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Sending…">
        Send report
      </SubmitButton>
    </form>
  );
}

export function BlockForm({ userId, personName }: { userId: string; personName: string }) {
  const [state, action] = useActionState(blockUserAction, emptyState);

  if (state.ok) return <p className="notice notice-ok">{state.message}</p>;

  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      <input type="hidden" name="user_id" value={userId} />
      <p className="text-sm leading-relaxed text-muted">
        Blocking hides you from {personName.split(" ")[0]} and them from you, in both directions.
        Neither of you can send the other a session request. They aren&apos;t told.
      </p>
      <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Blocking…">
        Block {personName.split(" ")[0]}
      </SubmitButton>
    </form>
  );
}
