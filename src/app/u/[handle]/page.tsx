import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestSessionForm } from "@/components/forms/session-forms";
import { BlockForm, ReportForm } from "@/components/forms/safety-forms";
import {
  Avatar,
  CreditPill,
  EmptyState,
  SkillPill,
  Stars,
  VerifiedBadge,
  formatWhen,
} from "@/components/ui";
import { MINUTES_PER_CREDIT, balanceOf } from "@/lib/credits";
import {
  getAvailability,
  getPublicUserByHandle,
  getRatingsForUser,
  getUserSkills,
  isBlockedEitherWay,
  ratingTagCounts,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatMinute = (minute: number): string => {
  const hour24 = Math.floor(minute / 60);
  const mm = String(minute % 60).padStart(2, "0");
  const suffix = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${mm}${suffix}`;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const person = getPublicUserByHandle(handle);
  if (!person) return { title: "Student not found" };

  const teaches = getUserSkills(person.id, "teach")
    .map((s) => s.skill_name)
    .slice(0, 4)
    .join(", ");

  return {
    title: `${person.name} teaches ${teaches || "on SkillSwap"}`,
    description: person.bio || `${person.name} is swapping skills on SkillSwap.`,
  };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ skill?: string }>;
}) {
  const { handle } = await params;
  const { skill: preselected } = await searchParams;

  const person = getPublicUserByHandle(handle);
  if (!person) notFound();

  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === person.id;
  const blocked = viewer && !isSelf ? isBlockedEitherWay(viewer.id, person.id) : false;

  const teaches = getUserSkills(person.id, "teach");
  const wants = getUserSkills(person.id, "learn");
  const availability = getAvailability(person.id);
  const ratings = getRatingsForUser(person.id);
  const tags = ratingTagCounts(person.id).slice(0, 5);
  const balance = viewer ? balanceOf(viewer.id) : 0;

  const canRequest =
    Boolean(viewer) &&
    !isSelf &&
    !blocked &&
    !person.is_suspended &&
    person.verification_status === "verified" &&
    viewer?.verification_status === "verified" &&
    teaches.length > 0;

  return (
    <div className="wrap grid gap-10 py-12 lg:grid-cols-[1.25fr_0.9fr] lg:py-16">
      {/* ------------------------------------------------------------- main */}
      <div>
        <div className="flex flex-wrap items-start gap-5">
          <Avatar label={person.name} size={84} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[2rem] sm:text-[2.375rem]">{person.name}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {[person.year, person.school_name].filter(Boolean).join(" · ") || "SkillSwap member"}
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <VerifiedBadge status={person.verification_status} showUnverified />
              <Stars value={person.rating_avg} count={person.rating_count} />
              {person.sessions_taught > 0 ? (
                <span className="pill pill-neutral nums">
                  {person.sessions_taught} session{person.sessions_taught === 1 ? "" : "s"} taught ·{" "}
                  {person.hours_taught.toFixed(person.hours_taught % 1 === 0 ? 0 : 1)}h
                </span>
              ) : (
                <span className="pill pill-neutral">New to SkillSwap</span>
              )}
            </div>
          </div>
          {isSelf ? (
            <Link href="/dashboard/profile" className="btn btn-ghost btn-sm">
              Edit profile
            </Link>
          ) : null}
        </div>

        {person.is_suspended ? (
          <p className="notice notice-error mt-6">
            This account is suspended while moderators look into a report. You can&apos;t request a
            session with them right now.
          </p>
        ) : null}

        {person.bio ? (
          <p className="mt-7 max-w-2xl text-[1.0625rem] leading-relaxed text-muted">{person.bio}</p>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag.tag} className="pill pill-verify">
                {tag.tag}
                <span className="nums opacity-70">×{tag.count}</span>
              </span>
            ))}
          </div>
        ) : null}

        {/* ---- teaches ---- */}
        <section className="mt-11">
          <h2 className="text-xl">Can teach you</h2>
          {teaches.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              {person.name.split(" ")[0]} hasn&apos;t listed anything to teach yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {teaches.map((skill) => (
                <li key={skill.id} className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <span className="text-xl" aria-hidden>
                    {skill.category_icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{skill.skill_name}</p>
                    {skill.note ? (
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">{skill.note}</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-faint">{skill.category_name}</p>
                    )}
                  </div>
                  <span className="pill pill-skill flex-none">{skill.level}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- wants ---- */}
        {wants.length > 0 ? (
          <section className="mt-9">
            <h2 className="text-xl">Wants to learn</h2>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {wants.map((skill) => (
                <SkillPill
                  key={skill.id}
                  name={skill.skill_name}
                  icon={skill.category_icon}
                  href={`/browse?q=${encodeURIComponent(skill.skill_name)}`}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">
              Teach any of these and you earn credits you can spend anywhere on SkillSwap.
            </p>
          </section>
        ) : null}

        {/* ---- availability ---- */}
        {availability.length > 0 ? (
          <section className="mt-9">
            <h2 className="text-xl">Usually free</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {availability.map((block) => (
                <li
                  key={`${block.weekday}-${block.start_minute}`}
                  className="card-flat flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="font-semibold">{DAY_NAMES[block.weekday]}</span>
                  <span className="nums text-muted">
                    {formatMinute(block.start_minute)} – {formatMinute(block.end_minute)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-faint">
              A guide, not a calendar — send a request and they&apos;ll confirm or suggest another
              time.
            </p>
          </section>
        ) : null}

        {/* ---- ratings ---- */}
        <section className="mt-11">
          <h2 className="text-xl">
            Ratings{" "}
            {person.rating_count > 0 ? (
              <span className="nums text-base font-normal text-muted">({person.rating_count})</span>
            ) : null}
          </h2>

          {ratings.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon="★"
                title="No ratings yet"
                body="Ratings appear after a session both people have confirmed. Being first is a good way to help someone get started."
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {ratings.map((rating) => (
                <li key={rating.id} className="card p-5">
                  <div className="flex items-start gap-3.5">
                    <Avatar label={rating.rater_name ?? "?"} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Link
                          href={`/u/${rating.rater_handle}`}
                          className="font-semibold hover:text-brand"
                        >
                          {rating.rater_name}
                        </Link>
                        <Stars value={rating.stars} />
                        {rating.skill_name ? (
                          <span className="pill pill-outline">{rating.skill_name}</span>
                        ) : null}
                      </div>
                      {rating.comment ? (
                        <p className="mt-2 text-sm leading-relaxed text-muted">{rating.comment}</p>
                      ) : null}
                      {rating.tags ? (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {rating.tags.split(",").map((tag) => (
                            <span key={tag} className="pill pill-neutral">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-2 text-xs text-faint">{formatWhen(rating.created_at)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ------------------------------------------------------------ aside */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-6" id="request">
          {isSelf ? (
            <>
              <h2 className="text-lg">This is how others see you</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                A specific bio and a note on each skill get far more requests than a blank profile.
              </p>
              <Link href="/dashboard/profile" className="btn btn-primary mt-5 w-full">
                Edit my profile
              </Link>
            </>
          ) : blocked ? (
            <>
              <h2 className="text-lg">You can&apos;t book this student</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                One of you has blocked the other. You can undo your own blocks in your safety
                settings.
              </p>
              <Link href="/dashboard/safety" className="btn btn-ghost mt-5 w-full">
                Safety settings
              </Link>
            </>
          ) : !viewer ? (
            <>
              <h2 className="text-lg">Request a session</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Join with your school email to book {person.name.split(" ")[0]}. New students get
                two credits — a full hour — to spend straight away.
              </p>
              <Link href="/signup" className="btn btn-primary mt-5 w-full">
                Create an account
              </Link>
              <Link href={`/login?next=/u/${person.handle}`} className="btn btn-ghost mt-2 w-full">
                I already have one
              </Link>
            </>
          ) : viewer.verification_status !== "verified" ? (
            <>
              <h2 className="text-lg">Verify to book</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Confirm your school email and your two welcome credits unlock immediately.
              </p>
              <Link href="/verify" className="btn btn-primary mt-5 w-full">
                Enter my code
              </Link>
            </>
          ) : canRequest ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg">Request a session</h2>
                <CreditPill credits={balance} showTime={false} size="sm" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                One credit is {MINUTES_PER_CREDIT} minutes. Nothing moves until you both confirm it
                happened.
              </p>
              <div className="mt-5">
                <RequestSessionForm
                  teacherId={person.id}
                  teacherName={person.name}
                  skills={teaches.map((s) => ({ id: s.skill_id, name: s.skill_name }))}
                  balance={balance}
                  preselectedSkillId={
                    teaches.find((s) => s.skill_slug === preselected)?.skill_id
                  }
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg">Not available right now</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {person.verification_status !== "verified"
                  ? `${person.name.split(" ")[0]} hasn't finished verifying their school email yet.`
                  : `${person.name.split(" ")[0]} isn't offering any skills at the moment.`}
              </p>
              <Link href="/browse" className="btn btn-ghost mt-5 w-full">
                Find someone else
              </Link>
            </>
          )}
        </div>

        {viewer && !isSelf && !blocked ? (
          <div className="card mt-5 p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-faint">
              If something&apos;s wrong
            </h2>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-ink hover:text-brand">
                Report {person.name.split(" ")[0]}
              </summary>
              <div className="mt-4">
                <ReportForm reportedUserId={person.id} personName={person.name} />
              </div>
            </details>

            <hr className="hr my-4" />

            <details>
              <summary className="cursor-pointer text-sm font-semibold text-ink hover:text-brand">
                Block {person.name.split(" ")[0]}
              </summary>
              <div className="mt-4">
                <BlockForm userId={person.id} personName={person.name} />
              </div>
            </details>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
