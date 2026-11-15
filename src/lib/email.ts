/**
 * Outbound mail. The `console` transport is the development default: it prints
 * the message to the server log instead of sending it, so you can verify a
 * signup without wiring up a mail provider.
 *
 * For a pilot, implement `smtpTransport` against your school's relay (or a
 * provider like Postmark) and set EMAIL_TRANSPORT=smtp.
 */

export interface Mail {
  to: string;
  subject: string;
  body: string;
}

function consoleTransport(mail: Mail): void {
  const line = "-".repeat(64);
  console.info(
    [
      line,
      "  SkillSwap mail (console transport — not actually sent)",
      line,
      `  To:      ${mail.to}`,
      `  Subject: ${mail.subject}`,
      line,
      mail.body
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n"),
      line,
    ].join("\n")
  );
}

function smtpTransport(mail: Mail): void {
  // Intentionally unimplemented. Wire this to your mail provider before a
  // pilot, and remove SHOW_DEV_VERIFICATION_CODE from the environment.
  throw new Error(
    `EMAIL_TRANSPORT=smtp is not implemented yet. Cannot send "${mail.subject}" to ${mail.to}.`
  );
}

export function sendMail(mail: Mail): void {
  const transport = (process.env.EMAIL_TRANSPORT ?? "console").toLowerCase();
  if (transport === "smtp") return smtpTransport(mail);
  return consoleTransport(mail);
}

export function sendVerificationCode(to: string, name: string, code: string): void {
  sendMail({
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
