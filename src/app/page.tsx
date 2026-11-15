import Link from "next/link";
import { MINUTES_PER_CREDIT, SIGNUP_BONUS_CREDITS } from "@/lib/credits";
import { SLOGAN } from "@/lib/constants";
import { communityStats, listCategoriesWithStats, searchTeachers } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import {
  Avatar,
  CreditPill,
  SectionHeading,
  SkillPill,
  StatTile,
  Stars,
  VerifiedBadge,
} from "@/components/ui";

const STEPS = [
  {
    n: "01",
    title: "List what you can teach",
    body: "Essay structure. Python loops. Bike repair. Conversational Korean. If a classmate would ask you about it, it counts.",
  },
  {
    n: "02",
    title: "Help someone, earn credits",
    body: `Run a session and you earn one credit for every ${MINUTES_PER_CREDIT} minutes. Both of you confirm it happened before credits move.`,
  },
  {
    n: "03",
    title: "Spend them on anything",
    body: "Credits aren't tied to the person you helped. Teach guitar, spend it on statistics. The whole community is your match pool.",
  },
];

export default async function HomePage() {
  const [user, stats, categories] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(communityStats()),
    Promise.resolve(listCategoriesWithStats()),
  ]);

  const featured = searchTeachers({ viewerId: user?.id ?? null, sort: "rating", limit: 3 });
  const liveCategories = categories.filter((c) => c.teacher_count > 0).slice(0, 8);

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="ink-panel">
        <div className="grid-lines">
          <div className="wrap grid items-center gap-14 py-20 lg:grid-cols-[1.08fr_0.92fr] lg:py-28">
            <div>
              <p className="eyebrow eyebrow-on-ink">Student skill exchange</p>

              <h1 className="mt-5 text-[2.75rem] leading-[0.98] sm:text-[3.5rem] lg:text-[4.25rem]">
                Your skills become{" "}
                <span
                  className="relative whitespace-nowrap"
                  style={{ color: "var(--c-credit-bright)" }}
                >
                  your currency
                </span>
                .
              </h1>

              <p
                className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed sm:text-[1.1875rem]"
                style={{ color: "var(--c-on-ink-muted)" }}
              >
                Teach a classmate what you already know. Earn time credits. Spend them learning
                anything else on SkillSwap — from organic chemistry to music production. No money
                changes hands, ever.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                {user ? (
                  <>
                    <Link href="/browse" className="btn btn-on-ink btn-lg">
                      Find a teacher
                    </Link>
                    <Link href="/dashboard" className="btn btn-outline-ink btn-lg">
                      Your dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/signup" className="btn btn-on-ink btn-lg">
                      Join with your school email
                    </Link>
                    <Link href="/browse" className="btn btn-outline-ink btn-lg">
                      See who&apos;s teaching
                    </Link>
                  </>
                )}
              </div>

              <ul
                className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm"
                style={{ color: "var(--c-on-ink-muted)" }}
              >
                {[
                  "Verified students only",
                  `${SIGNUP_BONUS_CREDITS} free credits to start`,
                  "Credits never expire",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M20 6.5 9.5 17 4 11.5"
                        stroke="var(--c-credit-bright)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* the core concept, drawn */}
            <div
              className="rounded-2xl border p-6 backdrop-blur-sm sm:p-7"
              style={{
                background: "rgb(255 255 255 / 0.06)",
                borderColor: "rgb(255 255 255 / 0.14)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--c-on-ink-muted)" }}
              >
                One credit = {MINUTES_PER_CREDIT} minutes
              </p>

              <div className="mt-5 space-y-3">
                <ExchangeRow
                  side="earn"
                  who="You taught Priya"
                  what="Spanish conversation · 1 hour"
                  delta="+2"
                />
                <div className="flex items-center gap-3 pl-1" aria-hidden>
                  <span
                    className="grid size-7 place-items-center rounded-full text-xs font-bold"
                    style={{ background: "rgb(255 255 255 / 0.1)", color: "var(--c-on-ink)" }}
                  >
                    ↓
                  </span>
                  <span className="text-xs" style={{ color: "var(--c-on-ink-muted)" }}>
                    credits land in your balance — not owed to Priya
                  </span>
                </div>
                <ExchangeRow
                  side="spend"
                  who="You learned from Dan"
                  what="Calculus II problem sets · 1 hour"
                  delta="−2"
                />
              </div>

              <div
                className="mt-6 flex items-center justify-between rounded-xl px-4 py-3.5"
                style={{ background: "rgb(255 255 255 / 0.08)" }}
              >
                <span className="text-sm font-semibold" style={{ color: "var(--c-on-ink)" }}>
                  No cash. No invoices. No debt.
                </span>
                <span
                  className="nums font-display text-xl font-bold"
                  style={{ color: "var(--c-credit-bright)" }}
                >
                  $0
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- the model */}
      <section className="wrap py-20 lg:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps, and the credit is yours to spend anywhere"
          lead="SkillSwap doesn't ask you to find someone who happens to want exactly what you offer. Help anyone, then learn from anyone."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="card card-hover p-7">
              <span
                className="nums font-display text-sm font-bold"
                style={{ color: "var(--c-brand)" }}
              >
                {step.n}
              </span>
              <h3 className="mt-3 text-xl">{step.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 card-flat flex flex-col gap-5 p-7 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-lg">Why not just trade directly?</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Direct swaps only work when two people want exactly what the other has — which almost
              never happens. Credits break that deadlock: the person you help and the person who
              helps you never have to be the same person.
            </p>
          </div>
          <Link href="/how-it-works" className="btn btn-quiet flex-none">
            Read the full model
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------------- categories */}
      {liveCategories.length > 0 ? (
        <section className="border-y border-line bg-surface py-20 lg:py-24">
          <div className="wrap">
            <SectionHeading
              eyebrow="What students are teaching"
              title="Skills on the exchange right now"
              action={
                <Link href="/categories" className="btn btn-ghost">
                  All categories
                </Link>
              }
            />
            <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {liveCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/browse?category=${category.slug}`}
                  className="card card-hover block p-6"
                >
                  <span className="text-2xl" aria-hidden>
                    {category.icon}
                  </span>
                  <h3 className="mt-3 text-base">{category.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-faint">
                    {category.sample_skills}
                  </p>
                  <p className="nums mt-4 text-xs font-bold" style={{ color: "var(--c-brand)" }}>
                    {category.teacher_count} teaching
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- people */}
      {featured.length > 0 ? (
        <section className="wrap py-20 lg:py-24">
          <SectionHeading
            eyebrow="Students on SkillSwap"
            title="Real people, verified by their school email"
            action={
              <Link href="/browse" className="btn btn-ghost">
                Browse everyone
              </Link>
            }
          />
          <div className="mt-11 grid gap-5 md:grid-cols-3">
            {featured.map(({ user: person, teaches }) => (
              <article key={person.id} className="card card-hover p-6">
                <div className="flex items-start gap-3.5">
                  <Avatar label={person.name} size={46} />
                  <div className="min-w-0">
                    <Link
                      href={`/u/${person.handle}`}
                      className="block truncate font-display text-lg font-bold tracking-[-0.02em] hover:text-brand"
                    >
                      {person.name}
                    </Link>
                    <p className="truncate text-xs text-faint">
                      {[person.year, person.school_name].filter(Boolean).join(" · ") ||
                        "SkillSwap member"}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <VerifiedBadge status={person.verification_status} />
                  <Stars value={person.rating_avg} count={person.rating_count} />
                </div>

                {person.bio ? (
                  <p className="mt-3.5 line-clamp-2 text-sm leading-relaxed text-muted">
                    {person.bio}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {teaches.slice(0, 3).map((skill) => (
                    <SkillPill key={skill.slug} name={skill.name} icon={skill.category_icon} />
                  ))}
                  {teaches.length > 3 ? (
                    <span className="pill pill-outline">+{teaches.length - 3}</span>
                  ) : null}
                </div>

                <Link href={`/u/${person.handle}`} className="btn btn-quiet btn-sm mt-5 w-full">
                  View profile
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ stats */}
      <section className="ink-panel">
        <div className="wrap py-16 lg:py-20">
          <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              onInk
              figure={stats.hours_exchanged.toLocaleString()}
              label="Hours exchanged"
              sub="between students, for free"
            />
            <StatTile
              onInk
              figure={stats.sessions_completed.toLocaleString()}
              label="Sessions completed"
              sub="both sides confirmed"
            />
            <StatTile
              onInk
              figure={stats.skills_offered.toLocaleString()}
              label="Distinct skills on offer"
              sub={`across ${stats.schools} school${stats.schools === 1 ? "" : "s"}`}
            />
            <StatTile
              onInk
              figure={stats.avg_rating ? stats.avg_rating.toFixed(1) : "—"}
              label="Average session rating"
              sub={`${stats.verified} verified students`}
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- safety */}
      <section className="wrap py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Built to feel safe"
              title="A community, not a marketplace"
              lead="Money turns study help into a transaction, and a transaction into a price. SkillSwap keeps it between students: everyone verifies a school email, every session is rated by both people, and a moderator reads every report."
            />
            <Link href="/safety" className="btn btn-primary mt-7">
              How we keep it safe
            </Link>
          </div>

          <ul className="space-y-3">
            {[
              {
                title: "School email verification",
                body: "A 6-digit code to your student address. Unverified accounts can look, but can't book or be booked.",
              },
              {
                title: "Both sides confirm every session",
                body: "Credits only move when the learner and the teacher both say it happened. No one can pay themselves.",
              },
              {
                title: "Public places and blocking",
                body: "In-person sessions name a public campus spot. One tap blocks someone, in both directions.",
              },
              {
                title: "Reports a human actually reads",
                body: "Every report lands in a moderation queue with an audit trail of what was done about it.",
              },
            ].map((item) => (
              <li key={item.title} className="card flex gap-4 p-5">
                <span
                  className="mt-0.5 grid size-8 flex-none place-items-center rounded-full"
                  style={{ background: "var(--c-verify-soft)" }}
                  aria-hidden
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6.5 9.5 17 4 11.5"
                      stroke="var(--c-verify)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------------- cta */}
      <section className="wrap pb-8">
        <div className="card-flat overflow-hidden px-7 py-14 text-center md:px-14">
          <p className="eyebrow">Free, and always will be</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-[2rem] md:text-[2.75rem]">{SLOGAN}</h2>
          <p className="mx-auto mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-muted">
            Sign up with your school email and we&apos;ll put {SIGNUP_BONUS_CREDITS} credits in your
            account — one full hour of learning, before you&apos;ve taught anyone a thing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={user ? "/browse" : "/signup"} className="btn btn-primary btn-lg">
              {user ? "Find a teacher" : "Create my free account"}
            </Link>
            <Link href="/how-it-works" className="btn btn-ghost btn-lg">
              How credits work
            </Link>
          </div>
          <div className="mt-8 flex justify-center">
            <CreditPill credits={SIGNUP_BONUS_CREDITS} />
          </div>
        </div>
      </section>
    </>
  );
}

function ExchangeRow({
  side,
  who,
  what,
  delta,
}: {
  side: "earn" | "spend";
  who: string;
  what: string;
  delta: string;
}) {
  const positive = side === "earn";
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl px-4 py-3.5"
      style={{
        background: "rgb(255 255 255 / 0.07)",
        border: "1px solid rgb(255 255 255 / 0.1)",
      }}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold" style={{ color: "var(--c-on-ink)" }}>
          {who}
        </p>
        <p className="truncate text-xs" style={{ color: "var(--c-on-ink-muted)" }}>
          {what}
        </p>
      </div>
      <span
        className="nums font-display text-lg font-bold"
        style={{ color: positive ? "var(--c-credit-bright)" : "var(--c-on-ink-muted)" }}
      >
        {delta}
      </span>
    </div>
  );
}
