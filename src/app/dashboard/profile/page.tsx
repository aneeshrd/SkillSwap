import type { Metadata } from "next";
import Link from "next/link";
import {
  AddSkillForm,
  AvailabilityForm,
  ProfileForm,
  SkillList,
} from "@/components/forms/profile-forms";
import { VerifiedBadge } from "@/components/ui";
import { getAvailability, getUserSkills, listSkills } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Profile & skills" };

export default async function ProfileSettingsPage() {
  const user = await requireUser("/dashboard/profile");

  const teaches = getUserSkills(user.id, "teach");
  const wants = getUserSkills(user.id, "learn");
  const availability = getAvailability(user.id);
  const allSkills = listSkills().map((skill) => ({
    id: skill.id,
    name: skill.name,
    category_name: skill.category_name,
  }));

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.875rem]">Profile &amp; skills</h1>
          <p className="mt-2 text-sm text-muted">
            What you list here is what students search. Specific beats impressive.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VerifiedBadge status={user.verification_status} showUnverified />
          <Link href={`/u/${user.handle}`} className="btn btn-ghost btn-sm">
            View public profile
          </Link>
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
        <section>
          <h2 className="text-xl">About you</h2>
          <div className="card mt-5 p-6">
            <ProfileForm
              defaults={{
                name: user.name,
                bio: user.bio,
                year: user.year,
                avatar_emoji: user.avatar_emoji,
              }}
            />
          </div>

          <h2 className="mt-11 text-xl">When you&apos;re usually free</h2>
          <p className="mt-2 text-sm text-muted">
            A rough guide shown on your profile. It doesn&apos;t block anything — people still send
            requests and you still confirm.
          </p>
          <div className="card mt-5 p-6">
            <AvailabilityForm blocks={availability} />
          </div>
        </section>

        <section>
          <h2 className="text-xl">
            What you teach{" "}
            <span className="nums text-base font-normal text-muted">({teaches.length})</span>
          </h2>
          <p className="mt-2 text-sm text-muted">
            You need at least one skill here before anyone can book you — and before you can earn a
            single credit.
          </p>
          <div className="card mt-5 p-6">
            <SkillList skills={teaches} kind="teach" />
            <hr className="hr my-5" />
            <AddSkillForm kind="teach" skills={allSkills} />
          </div>

          <h2 className="mt-11 text-xl">
            What you want to learn{" "}
            <span className="nums text-base font-normal text-muted">({wants.length})</span>
          </h2>
          <p className="mt-2 text-sm text-muted">
            This drives your match ranking on Browse, and lets teachers see when a swap would suit
            you both.
          </p>
          <div className="card mt-5 p-6">
            <SkillList skills={wants} kind="learn" />
            <hr className="hr my-5" />
            <AddSkillForm kind="learn" skills={allSkills} />
          </div>
        </section>
      </div>
    </div>
  );
}
