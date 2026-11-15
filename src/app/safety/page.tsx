import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui";
import { REPORT_CATEGORIES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Safety and verification",
  description:
    "How SkillSwap verifies students, what the community guidelines are, and what happens when you report someone.",
};

const LAYERS = [
  {
    title: "A school email, confirmed",
    body: "Registration is limited to recognised school domains, and a 6-digit code to that address has to be entered before an account can book or be booked. Codes are stored hashed and expire in 20 minutes.",
    limit: "What it proves: this person has an active address at a school we recognise. What it doesn't prove: who they are, or that they're safe to meet.",
  },
  {
    title: "Two-sided confirmation",
    body: "Credits only move when the learner and the teacher both confirm a session took place. Neither of you can release them alone.",
    limit: "What it prevents: fake sessions, self-dealing, and credit farming between two accounts run by one person.",
  },
  {
    title: "Ratings in both directions",
    body: "Teachers rate learners and learners rate teachers, after every completed session. Ratings and tags are public on profiles.",
    limit: "What it surfaces: patterns. One bad session is noise; three in a row is a signal, and it's visible before anyone books.",
  },
  {
    title: "Blocking, instantly and quietly",
    body: "One tap hides you from someone and them from you, in both directions, across search, browse and requests. They are never told.",
    limit: "You can undo your own blocks any time from your safety settings.",
  },
  {
    title: "A moderator who is a real person",
    body: "Every report goes to a named moderator at your school. They can suspend an account, which signs it out everywhere immediately, return credits, and record what they did.",
    limit: "Every moderator action is written to an audit log. Moderators can't quietly edit a balance — a correction is a visible ledger entry with a reason attached.",
  },
];

const GUIDELINES = [
  {
    rule: "Meet somewhere public",
    detail:
      "In-person sessions name a public place on campus — a library, a study room, a cafe. Never a private home or a dorm room. If someone pushes for somewhere private, decline and report it.",
  },
  {
    rule: "Teach the method, not the answer",
    detail:
      "Explaining how to approach a problem is the point. Completing someone's assessed work is academic misconduct, and it will get both accounts suspended here as well as whatever your school does.",
  },
  {
    rule: "Don't claim a skill you don't have",
    detail:
      "Listing something you're shaky on wastes an hour of someone's credits and your own reputation. 'Beginner' is a perfectly good level to teach at — say so.",
  },
  {
    rule: "Turn up, or say you can't",
    detail:
      "Cancelling with a reason is fine and costs nobody anything. Silence is what wrecks it. A no-show is reportable.",
  },
  {
    rule: "No money, ever",
    detail:
      "Nobody should ask you to pay, tip or buy anything for a session. There is no legitimate reason for money to come up on SkillSwap. Report it if it does.",
  },
  {
    rule: "Keep it to the session",
    detail:
      "SkillSwap is for learning. Using it to ask people out, sell things or recruit for anything is a fast way to lose your account.",
  },
];

export default function SafetyPage() {
  return (
    <>
      <section className="ink-panel">
        <div className="grid-lines">
          <div className="wrap py-16 lg:py-20">
            <p className="eyebrow eyebrow-on-ink">Safety</p>
            <h1 className="mt-5 max-w-3xl text-[2.5rem] leading-[1.02] sm:text-[3.25rem]">
              Verification is one layer. It was never going to be enough on its own.
            </h1>
            <p
              className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed sm:text-[1.1875rem]"
              style={{ color: "var(--c-on-ink-muted)" }}
            >
              Here is exactly what SkillSwap checks, what each check actually proves, and what it
              doesn&apos;t. You should know the limits before you meet a stranger from the internet,
              even one with a school email address.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap py-16 lg:py-20">
        <SectionHeading
          eyebrow="How it's built"
          title="Five layers, and what each one is worth"
          lead="No single check makes a community safe. These are meant to overlap."
        />

        <ol className="mt-11 space-y-4">
          {LAYERS.map((layer, index) => (
            <li key={layer.title} className="card p-6 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                <span
                  className="nums grid size-10 flex-none place-items-center rounded-full font-display text-base font-bold"
                  style={{ background: "var(--c-verify-soft)", color: "var(--c-verify)" }}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg">{layer.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{layer.body}</p>
                  <p className="mt-3 border-l-2 pl-3.5 text-sm leading-relaxed text-faint" style={{ borderColor: "var(--c-line-strong)" }}>
                    {layer.limit}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-surface py-16 lg:py-20" id="guidelines">
        <div className="wrap">
          <SectionHeading
            eyebrow="Community guidelines"
            title="Six rules, and we mean all of them"
            lead="You agreed to these when you signed up. Breaking them is how accounts get suspended."
          />

          <div className="mt-11 grid gap-4 md:grid-cols-2">
            {GUIDELINES.map((item, index) => (
              <div key={item.rule} className="card p-6">
                <div className="flex items-baseline gap-3">
                  <span className="nums font-display text-sm font-bold" style={{ color: "var(--c-brand)" }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg">{item.rule}</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap py-16 lg:py-20" id="reporting">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading
              eyebrow="Reporting"
              title="What happens after you report someone"
            />
            <ol className="mt-8 space-y-4">
              {[
                "You report from their profile or from the session. You pick a category and describe what happened.",
                "The report lands in a moderation queue at your school. The person you reported is never told who filed it.",
                "A moderator reviews it and records a decision: resolved, dismissed, or escalated to a suspension.",
                "If credits were lost to a no-show, the moderator returns them as a visible ledger correction with a reason attached.",
                "You can see the status of every report you've filed in your safety settings.",
              ].map((line, index) => (
                <li key={line} className="flex gap-4">
                  <span
                    className="nums grid size-7 flex-none place-items-center rounded-full text-xs font-bold"
                    style={{ background: "var(--c-brand-soft)", color: "var(--c-brand)" }}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <p className="leading-relaxed text-muted">{line}</p>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="card p-7">
              <h3 className="text-lg">What you can report</h3>
              <ul className="mt-4 space-y-2.5">
                {REPORT_CATEGORIES.map((category) => (
                  <li key={category.value} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="size-1.5 flex-none rounded-full"
                      style={{ background: "var(--c-brand)" }}
                      aria-hidden
                    />
                    {category.label}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm leading-relaxed text-muted">
                Reporting is rate-limited to stop it being used as a weapon, and filing one in bad
                faith is itself a guidelines breach.
              </p>
            </div>

            <div className="notice notice-error mt-5">
              <strong>In an emergency, don&apos;t start here.</strong> SkillSwap is a student
              project, not an emergency service. If you are in immediate danger, contact your local
              emergency number or campus security first, then report it here so the account can be
              suspended.
            </div>

            <div className="card-flat mt-5 p-6">
              <h3 className="text-base">Your data</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Your email address is never shown to other students. Passwords are stored as scrypt
                hashes and verification codes as SHA-256 hashes — nobody at SkillSwap can read
                either, which is also why we can never tell you your own code.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/signup" className="btn btn-primary btn-lg">
            Join SkillSwap
          </Link>
          <Link href="/how-it-works" className="btn btn-ghost btn-lg">
            How credits work
          </Link>
        </div>
      </section>
    </>
  );
}
