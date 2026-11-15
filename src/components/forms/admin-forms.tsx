"use client";

import { useActionState } from "react";
import {
  adjustCreditsAction,
  manualVerifyAction,
  reinstateUserAction,
  resolveReportAction,
  suspendUserAction,
} from "@/app/actions/admin";
import { emptyState } from "@/lib/forms";
import { Field, FormAlert, SubmitButton } from "./shared";

export function ResolveReportForm({ reportId }: { reportId: string }) {
  const [state, action] = useActionState(resolveReportAction, emptyState);

  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      <input type="hidden" name="report_id" value={reportId} />
      <textarea
        name="resolution_note"
        className="textarea min-h-20"
        placeholder="What did you do about it? This is written to the audit log and shown to the reporter."
      />
      <div className="flex flex-wrap gap-2">
        <button name="status" value="resolved" type="submit" className="btn btn-primary btn-sm">
          Resolve
        </button>
        <button name="status" value="reviewing" type="submit" className="btn btn-quiet btn-sm">
          Mark reviewing
        </button>
        <button name="status" value="dismissed" type="submit" className="btn btn-ghost btn-sm">
          Dismiss
        </button>
      </div>
    </form>
  );
}

export function SuspendForm({ userId, name }: { userId: string; name: string }) {
  const [state, action] = useActionState(suspendUserAction, emptyState);

  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold text-danger hover:underline">
        Suspend {name}
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <FormAlert state={state} />
        <input type="hidden" name="user_id" value={userId} />
        <Field
          label="Reason (recorded in the audit log)"
          htmlFor={`reason_${userId}`}
          error={state.fieldErrors?.reason}
        >
          <textarea id={`reason_${userId}`} name="reason" className="textarea min-h-20" required />
        </Field>
        <p className="hint">Suspending signs the account out everywhere immediately.</p>
        <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Suspending…">
          Suspend account
        </SubmitButton>
      </form>
    </details>
  );
}

export function ReinstateForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(reinstateUserAction, emptyState);
  return (
    <form action={action} className="flex items-center gap-2">
      <FormAlert state={state} />
      <input type="hidden" name="user_id" value={userId} />
      <input name="reason" className="input py-1.5 text-sm" placeholder="Note (optional)" />
      <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…">
        Reinstate
      </SubmitButton>
    </form>
  );
}

export function VerifyDecisionForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(manualVerifyAction, emptyState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <FormAlert state={state} />
      <input type="hidden" name="user_id" value={userId} />
      <input name="note" className="input py-1.5 text-sm" placeholder="Note" />
      <button name="decision" value="verified" type="submit" className="btn btn-primary btn-sm">
        Verify
      </button>
      <button name="decision" value="rejected" type="submit" className="btn btn-ghost btn-sm">
        Reject
      </button>
    </form>
  );
}

export function AdjustCreditsForm() {
  const [state, action] = useActionState(adjustCreditsAction, emptyState);

  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <Field
        label="Student ID"
        htmlFor="adjust_user"
        hint="Copy it from the report or the account below."
        error={state.fieldErrors?.user_id}
      >
        <input id="adjust_user" name="user_id" className="input" required />
      </Field>
      <Field
        label="Credits"
        htmlFor="adjust_delta"
        hint="Negative to take credits back. Corrections may push a balance below zero."
        error={state.fieldErrors?.delta}
      >
        <input id="adjust_delta" name="delta" type="number" className="input nums" required />
      </Field>
      <Field label="Reason" htmlFor="adjust_note" error={state.fieldErrors?.note}>
        <input id="adjust_note" name="note" className="input" required minLength={5} />
      </Field>
      <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Posting…">
        Post correction
      </SubmitButton>
    </form>
  );
}
