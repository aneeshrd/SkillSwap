# The trust model

SkillSwap introduces students to strangers and then suggests they meet. That
deserves an honest account of what the platform checks, what each check
actually proves, and where it stops.

## Layer 1 — School email verification

**What it does.** Registration is restricted to domains in
`ALLOWED_EMAIL_DOMAINS`. A 6-digit code is sent to that address and must be
entered before the account can request or receive a session. Codes are stored
as SHA-256 hashes, expire in 20 minutes, allow 6 attempts, and are superseded
on resend.

**What it proves.** This person has an active mailbox at a recognised school.

**What it does not prove.** Who they are. Students share accounts, keep alumni
addresses, and occasionally sell credentials. A verified badge means
"plausibly a member of this campus", not "safe to meet alone".

This limitation is stated on the in-app `/safety` page in the same words,
because a student deciding whether to meet someone deserves to know it.

## Layer 2 — Two-sided confirmation

Credits move only when the learner *and* the teacher confirm the session
happened. One confirmation records intent; the second triggers the transfer.

This closes the obvious attack: two accounts run by one person confirming
imaginary sessions to farm credits. It also means a no-show costs the learner
nothing — don't confirm, and the credits stay held until a moderator releases
them or the sweep expires the session.

## Layer 3 — Two-way ratings

Both people rate each other after a completed session, with free text and tags
from a fixed vocabulary. Ratings are public on profiles and cannot be deleted
by their subject.

One bad rating is noise. Three in a row is a pattern, and it is visible before
anyone books.

## Layer 4 — Blocking

One action hides two students from each other across search, browse and
requests, in both directions. The blocked person is not notified. Blocks are
reversible by the person who made them, from `/dashboard/safety`.

## Layer 5 — Human moderation

Reports are categorised (no-show, inappropriate behaviour, harassment,
misrepresented skill, safety concern, spam, other) and land in a queue at
`/admin` for the addresses listed in `ADMIN_EMAILS`.

A moderator can:

- move a report through `reviewing → resolved | dismissed` with a note the
  reporter can see;
- suspend an account, which revokes every live session immediately;
- reinstate an account;
- verify or reject an account manually;
- post a credit correction — which is an ordinary ledger row with a mandatory
  reason, never a silent balance edit.

Every one of those writes a row to `admin_audit`. A moderator cannot act
invisibly.

Reporting is rate-limited (6 per day) so it cannot be used as a weapon, and
filing a bad-faith report is itself a guidelines breach.

## Design choices made for safety

**In-person sessions name a public place.** The request form requires a
location for in-person sessions and the help text asks for somewhere public on
campus. This is a nudge, not an enforcement — the platform cannot verify where
anyone actually went.

**No direct messaging.** Communication is limited to the learner's request
message and the teacher's reply. DMs are the largest moderation surface in a
student platform; leaving them out removes a whole class of harm at a real cost
to convenience.

**No file or image uploads.** Avatars are initials. No uploads means no image
moderation pipeline and no obligations around illegal imagery.

**No payments.** There is no payment code path at all. "Nobody should ever ask
you for money" is therefore an enforceable rule rather than a policy.

**Academic integrity is explicit.** Teaching a method is the product; completing
someone's assessed work is grounds for suspension, and the guidelines say so.

## Data handling

- Passwords: scrypt, salted, never recoverable.
- Verification codes: SHA-256, never recoverable. This is why the app cannot
  show a student their own code, even in development.
- Email addresses: never exposed to other students by any query used in the UI.
- Session cookies: httpOnly, SameSite=Lax, `secure` in production, HMAC-signed,
  revocable server-side.
- Public by default: name, year, school, bio, skills, availability and ratings.

## Honest gaps

- **No identity verification** beyond an email domain.
- **No background checks.** Nor should a student project attempt them.
- **No age verification.** Some students are minors. SkillSwap has no mechanism
  to detect that, and a school running a pilot needs its own safeguarding
  policy on top of this software.
- **No emergency escalation.** `/safety` tells students to contact campus
  security or emergency services first and report here afterwards, because
  that is the truth.
- **Moderation isn't staffed by default.** `ADMIN_EMAILS` is a config value,
  not a rota, an SLA or a trained team. A school piloting this needs to assign
  real people before the first student signs up.
- **No appeals process.** A suspended student is told to email the moderators.
  That is thin, and it should be designed properly before any pilot scales.
