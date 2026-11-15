/**
 * Outbound mail.
 *
 *   EMAIL_TRANSPORT=console   print to the server log (development default)
 *   EMAIL_TRANSPORT=resend    send for real through the Resend HTTPS API
 *
 * Resend is used rather than SMTP because most container hosts block outbound
 * ports 25/465/587, and an HTTPS API doesn't care. Swapping in another
 * provider means replacing one function.
 */

export interface Mail {
  to: string;
  subject: string;
  body: string;
}

export type MailResult = { ok: true } | { ok: false; error: string };

function activeTransport(): "console" | "resend" {
  const configured = (process.env.EMAIL_TRANSPORT ?? "").toLowerCase();
  if (configured === "resend") return "resend";
  if (configured === "console") return "console";
  // Unset: send for real if we have a key, otherwise fall back to the log.
  return process.env.RESEND_API_KEY ? "resend" : "console";
}

function consoleTransport(mail: Mail): MailResult {
  const rule = "-".repeat(64);
  console.info(
    [
      rule,
      "  SkillSwap mail (console transport — not actually sent)",
      rule,
      `  To:      ${mail.to}`,
      `  Subject: ${mail.subject}`,
      rule,
      mail.body
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
      rule,
    ].join("\n")
  );
  return { ok: true };
}

async function resendTransport(mail: Mail): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, error: "RESEND_API_KEY is not set." };
  }

  const from = process.env.EMAIL_FROM?.trim() || "SkillSwap <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.body,
      }),
      // Don't let a hanging provider hold a signup open.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`Resend rejected the message (${response.status}): ${detail}`);
      return { ok: false, error: `Mail provider returned ${response.status}.` };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Could not reach the mail provider: ${message}`);
    return { ok: false, error: "Could not reach the mail provider." };
  }
}

export async function sendMail(mail: Mail): Promise<MailResult> {
  return activeTransport() === "resend" ? resendTransport(mail) : consoleTransport(mail);
}

export async function sendVerificationCode(
  to: string,
  name: string,
  code: string
): Promise<MailResult> {
  return sendMail({
    to,
    subject: `${code} is your SkillSwap verification code`,
    body: [
      `Hi ${name},`,
      "",
      "Confirm your school email to finish joining SkillSwap.",
      "",
      `    ${code}`,
      "",
      "The code expires in 20 minutes. If you didn't try to sign up,",
      "you can ignore this message and nothing will happen.",
      "",
      "— SkillSwap",
      "Your skills become your currency.",
    ].join("\n"),
  });
}

/** True when codes are only being written to the server log. */
export function mailIsSimulated(): boolean {
  return activeTransport() === "console";
}
