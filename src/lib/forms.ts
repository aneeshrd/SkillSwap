/** Shared shape for every server action that backs a form. */
export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const emptyState: FormState = {};

export function fieldErrorsFrom(
  issues: { path: (string | number)[]; message: string }[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const str = (data: FormData, key: string): string =>
  typeof data.get(key) === "string" ? (data.get(key) as string).trim() : "";
