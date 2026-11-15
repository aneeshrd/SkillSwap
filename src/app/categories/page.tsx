import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui";
import { listCategoriesWithStats } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Skill categories",
  description:
    "Browse every category on SkillSwap, from academics and code to music, climbing and bike repair.",
};

export default function CategoriesPage() {
  const categories = listCategoriesWithStats();
  const totalTeaching = categories.reduce((sum, c) => sum + c.teacher_count, 0);

  return (
    <div className="wrap py-12 lg:py-16">
      <SectionHeading
        eyebrow="Everything on offer"
        title="Skill categories"
        lead="Academic subjects sit next to bike repair and singing technique on purpose. A skill counts if a classmate would ask you about it."
      />

      <div className="mt-11 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const empty = category.teacher_count === 0;
          return (
            <Link
              key={category.id}
              href={`/browse?category=${category.slug}`}
              className="card card-hover flex flex-col p-6"
            >
              <span className="text-3xl" aria-hidden>
                {category.icon}
              </span>
              <h2 className="mt-3.5 text-xl">{category.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{category.blurb}</p>

              <p className="mt-4 text-xs leading-relaxed text-faint">
                Includes {category.sample_skills}
                {category.skill_count > 4 ? ` and ${category.skill_count - 4} more` : ""}
              </p>

              <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
                {empty ? (
                  <span className="pill pill-neutral">Nobody teaching yet — be first</span>
                ) : (
                  <>
                    <span className="pill pill-skill nums">{category.teacher_count} teaching</span>
                    <span className="pill pill-outline nums">{category.learner_count} learning</span>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="card-flat mt-8 flex flex-col gap-5 p-7 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-lg">
            <span className="nums">{totalTeaching}</span> students are teaching something right now
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Missing a skill you&apos;d teach? Add it to your profile and it shows up here for
            everyone else.
          </p>
        </div>
        <Link href="/dashboard/profile" className="btn btn-primary flex-none">
          Add a skill
        </Link>
      </div>
    </div>
  );
}
