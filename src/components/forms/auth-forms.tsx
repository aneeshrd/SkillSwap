"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  logInAction,
  resendCodeAction,
  signUpAction,
  verifyCodeAction,
} from "@/app/actions/auth";
import { SCHOOL_YEARS } from "@/lib/constants";
import { emptyState, type FormState } from "@/lib/forms";
import { Field, FormAlert, SubmitButton } from "./shared";

export function SignUpForm({ allowedDomains }: { allowedDomains: string[] }) {
  const [state, action] = useActionState(signUpAction, emptyState);

  return (
    <form action={action} className="space-y-5">
      <FormAlert state={state} />

      <Field label="Your name" htmlFor="name" error={state.fieldErrors?.name}>
        <input
          id="name"
          name="name"
          className="input"
          autoComplete="name"
          placeholder="Maya Rodriguez"
          required
        />
      </Field>

      <Field
        label="School email"
        htmlFor="email"
        hint={
          allowedDomains.length
            ? `Open to students at ${allowedDomains.slice(0, 3).join(", ")}`
            : "Use the address your school gave you"
        }
        error={state.fieldErrors?.email}
      >
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          placeholder={`you@${allowedDomains[0] ?? "school.edu"}`}
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint="At least 10 characters. A short phrase works well."
        error={state.fieldErrors?.password}
      >
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <Field label="Year (optional)" htmlFor="year" error={state.fieldErrors?.year}>
        <select id="year" name="year" className="select" defaultValue="">
          <option value="">Prefer not to say</option>
          {SCHOOL_YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex gap-3 rounded-md border border-line bg-surface p-3.5 text-sm">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 flex-none accent-[var(--c-brand)]" required />
        <span className="text-muted">
          I&apos;ll treat other students the way I&apos;d want to be treated, and I&apos;ve read the{" "}
          <Link href="/safety#guidelines" className="link">
            community guidelines
          </Link>
          .
        </span>
      </label>
      {state.fieldErrors?.terms ? <p className="field-error">{state.fieldErrors.terms}</p> : null}

      <SubmitButton className="btn btn-primary btn-lg w-full" pendingLabel="Creating your account…">
        Create my account
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        Already here?{" "}
        <Link href="/login" className="link">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function LogInForm({ next }: { next: string }) {
  const [state, action] = useActionState(logInAction, emptyState);

  return (
    <form action={action} className="space-y-5">
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next} />

      <Field label="School email" htmlFor="email" error={state.fieldErrors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          required
        />
      </Field>

      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton className="btn btn-primary btn-lg w-full" pendingLabel="Logging in…">
        Log in
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="link">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function VerifyForm({ devHint }: { devHint?: boolean }) {
  const [state, action] = useActionState(verifyCodeAction, emptyState);
  const [resendState, resend] = useActionState<FormState, FormData>(
    async () => resendCodeAction(),
    emptyState
  );

  return (
    <div className="space-y-5">
      {devHint ? (
        <p className="notice notice-credit">
          <strong>Development mode:</strong> nothing was emailed. Your 6-digit code was printed to
          the terminal running <code>npm run dev</code>. Codes are stored hashed, so this page
          genuinely cannot show you one.
        </p>
      ) : null}

      <form action={action} className="space-y-5">
        <FormAlert state={state} />
        <Field
          label="6-digit code"
          htmlFor="code"
          hint="Check your school inbox. The code expires in 20 minutes."
          error={state.fieldErrors?.code}
        >
          <input
            id="code"
            name="code"
            className="input nums text-center text-2xl font-bold tracking-[0.35em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="000000"
            required
          />
        </Field>
        <SubmitButton className="btn btn-primary btn-lg w-full" pendingLabel="Checking…">
          Verify my school email
        </SubmitButton>
      </form>

      <form action={resend}>
        <FormAlert state={resendState} />
        <SubmitButton className="btn btn-ghost btn-sm w-full" pendingLabel="Sending…">
          Send me a new code
        </SubmitButton>
      </form>
    </div>
  );
}
