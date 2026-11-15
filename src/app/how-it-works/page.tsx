import type { Metadata } from "next";
import Link from "next/link";
import { CreditPill, SectionHeading } from "@/components/ui";
import { SLOGAN } from "@/lib/constants";
import { MINUTES_PER_CREDIT, SIGNUP_BONUS_CREDITS } from "@/lib/credits";

export const metadata: Metadata = {
  title: "How credits work",
  description:
    "One credit is 30 minutes of another student's time. Here's how earning, holding and spending works on SkillSwap.",
};

const LIFECYCLE = [
  {
    step: "You send a request",
    body: "You pick a skill, a length and a time. The credits it costs leave your balance immediately and are held.",
    detail: "Holding at request time is what stops the same credit being promised to three people at once.",
  },
  {
    step: "They accept or decline",
    body: "If they decline, or either of you cancels, every held credit goes straight back to you. In full, automatically.",
    detail: "A declined request costs you nothing. There is no fee and no penalty.",
  },
  {
    step: "The session happens",
    body: "In a public place on campus, or on a video call. Whatever you agreed.",
    detail: "SkillSwap doesn't host the call or take a cut — it just keeps the books.",
  },
  {
    step: "You both confirm",
    body: "The teacher is paid the moment the second person confirms. One person confirming is never enough.",
    detail: "This is the rule that makes the ledger trustworthy: nobody can move credits on their own say-so.",
  },
  {
    step: "You both rate",
    body: "A rating and a few tags. It takes ten seconds and it's what the next student reads.",
    detail: "Ratings go both ways — teachers rate learners too.",
  },
];

const FAQ = [
  {
    q: "Is any of this paid?",
    a: "No. There is no payment system, no subscription and no premium tier. Credits cannot be bought, sold, gifted or cashed out, and they have no monetary value. If anyone asks you to pay them for a SkillSwap session, report it.",
  },
  {
    q: "Do credits expire?",
    a: "No. A credit you earn in first year still buys you half an hour in your final year.",
  },
  {
    q: "What if the person I want to learn from doesn't want what I teach?",
    a: "That's exactly the problem credits solve. You never need a two-way match. Teach anyone, then spend what you earned on anyone else.",
  },
  {
    q: "Is a graduate hour worth more than a first-year hour?",
    a: "No, and that's a deliberate choice rather than an oversight. Pricing time by expertise rebuilds the money economy with extra steps, and it prices out the students who most need help. An hour is an hour.",
  },
  {
    q: "What stops someone collecting credits and never teaching?",
    a: "Nothing stops you learning more than you teach — you just run out of credits. You start with two, and after that you can only spend what you've earned.",
  },
  {
    q: "What if someone doesn't turn up?",
    a: "Don't confirm the session. Credits stay held and nothing is paid. Report the no-show and a moderator can return your credits and act on the account.",
  },
  {
    q: "Can I use SkillSwap for coursework someone else should be doing?",
    a: "Teaching someone a method is the point. Doing their assessed work for them is academic misconduct at every school we know of, and it will get both accounts suspended here as well as whatever your school does about it.",
  },
  {
    q: "Who can see my profile?",
    a: "Anyone on the internet can see your name, year, school, bio, skills and ratings. Your email address is never shown. Only verified students can send you a request.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="ink-panel">
        <div className="grid-lines">
          <div className="wrap py-16 lg:py-20">
            <p className="eyebrow eyebrow-on-ink">The model</p>
            <h1 className="mt-5 max-w-3xl text-[2.5rem] leading-[1.02] sm:text-[3.25rem]">
              One credit is {MINUTES_PER_CREDIT} minutes of another student&apos;s time.
            </h1>
            <p
              className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed sm:text-[1.1875rem]"
              style={{ color: "var(--c-on-ink-muted)" }}
            >
              That&apos;s the whole unit of account. Everything below is just bookkeeping around
              it — who earned one, who spent one, and what happens when something goes wrong.
            </p>
          </div>
        </div>
      </section>

      {/* ---- the rate card ---- */}
      <section className="wrap py-16 lg:py-20">
        <SectionHeading
          eyebrow="The rate"
          title="The same for everyone, in every subject"
          lead="There is no price list, because there are no prices. Length is the only thing that changes what a session costs."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "30 minutes", credits: 1 },
            { label: "1 hour", credits: 2 },
            { label: "1 hour 30", credits: 3 },
            { label: "2 hours", credits: 4 },
          ].map((row) => (
            <div key={row.label} className="card p-6 text-center">
              <p className="stat-figure text-[2.5rem]">{row.credits}</p>
              <p className="mt-1 text-sm font-semibold">
                credit{row.credits === 1 ? "" : "s"}
              </p>
              <p className="mt-2 text-sm text-muted">{row.label}</p>
            </div>
          ))}
        </div>

        <div className="card-flat mt-6 flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            New students get <strong className="text-ink">{SIGNUP_BONUS_CREDITS} credits</strong> on
            verifying their school email — a full hour of learning before they&apos;ve taught
            anyone anything. It&apos;s a grant from the community, not a loan.
          </p>
          <CreditPill credits={SIGNUP_BONUS_CREDITS} />
        </div>
      </section>

      {/* ---- lifecycle ---- */}
      <section className="border-y border-line bg-surface py-16 lg:py-20">
        <div className="wrap">
          <SectionHeading
            eyebrow="A session, start to finish"
            title="Where your credits are at every point"
            lead="The honest version, including what happens when a session falls through."
          />

          <ol className="mt-11 space-y-4">
            {LIFECYCLE.map((item, index) => (
              <li key={item.step} className="card flex flex-col gap-4 p-6 sm:flex-row sm:gap-6">
                <span
                  className="nums grid size-10 flex-none place-items-center rounded-full font-display text-base font-bold"
                  style={{ background: "var(--c-brand)", color: "var(--c-on-brand)" }}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg">{item.step}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{item.body}</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-faint">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- not a marketplace ---- */}
      <section className="wrap py-16 lg:py-20" id="not-a-marketplace">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <SectionHeading
            eyebrow="Why there's no money"
            title="A paid tutoring site would be easier to build. It would also be a different thing."
          />

          <div className="space-y-5 text-[1.0625rem] leading-relaxed text-muted">
            <p>
              The moment a session has a price, two things happen. The students who most need help
              are the ones who can least afford it. And the students with the most in-demand
              knowledge stop giving it away — because now there&apos;s a market rate, and
              volunteering below it feels like a loss.
            </p>
            <p>
              Time credits sidestep both. Nobody can be priced out, because nobody is charged. And
              nobody is undercutting anyone, because an hour is an hour whoever gives it.
            </p>
            <p>
              The trade-off is real and worth stating plainly: SkillSwap can&apos;t guarantee
              quality the way paying a professional tutor can. What it has instead is ratings from
              both sides, verified student accounts, and a moderator who can suspend someone. For
              a classmate explaining a problem set at 9pm, that&apos;s usually the right trade.
            </p>
            <p className="font-display text-xl font-bold tracking-[-0.025em] text-ink">{SLOGAN}</p>
          </div>
        </div>
      </section>

      {/* ---- faq ---- */}
      <section className="border-t border-line bg-surface py-16 lg:py-20" id="faq">
        <div className="wrap">
          <SectionHeading eyebrow="Questions" title="Things students actually ask" />

          <div className="mt-10 grid gap-3 lg:grid-cols-2">
            {FAQ.map((item) => (
              <details key={item.q} className="card group p-6">
                <summary className="cursor-pointer list-none font-display text-lg font-bold tracking-[-0.02em]">
                  {item.q}
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary btn-lg">
              Join SkillSwap
            </Link>
            <Link href="/safety" className="btn btn-ghost btn-lg">
              Read about safety
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
