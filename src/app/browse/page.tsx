import type { Metadata } from "next";
import Link from "next/link";
import { MatchCard } from "@/components/match-card";
import { EmptyState, SectionHeading } from "@/components/ui";
import { listCategories, listSchools, searchTeachers } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Find a teacher",
  description:
    "Search students by skill, category or school and send a session request using your time credits.",
};

const SORTS = [
  { value: "match", label: "Best match for you" },
  { value: "rating", label: "Highest rated" },
  { value: "active", label: "Most sessions taught" },
  { value: "newest", label: "Newest members" },
] as const;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    school?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  const sort = (SORTS.find((s) => s.value === params.sort)?.value ??
    (user ? "match" : "rating")) as "match" | "rating" | "active" | "newest";

  const results = searchTeachers({
    viewerId: user?.id ?? null,
    query: params.q ?? "",
    categorySlug: params.category ?? "",
    schoolId: params.school ?? "",
    sort,
  });

  const categories = listCategories();
  const schools = listSchools();
  const activeCategory = categories.find((c) => c.slug === params.category);
  const hasFilters = Boolean(params.q || params.category || params.school);

  return (
    <div className="wrap py-12 lg:py-16">
      <SectionHeading
        eyebrow="The exchange"
        title={activeCategory ? `${activeCategory.icon} ${activeCategory.name}` : "Find a teacher"}
        lead={
          activeCategory
            ? activeCategory.blurb
            : "Every student here has confirmed a school email and offers at least one skill. Search by what you want to learn, then send a request using your credits."
        }
      />

      {/* ---- filters: a plain GET form, so results are linkable and work without JS ---- */}
      <form method="get" className="card mt-9 grid gap-4 p-5 md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-end">
        <div>
          <label className="label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            className="input"
            placeholder="Calculus, Figma, Korean, bike repair…"
            defaultValue={params.q ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <select id="category" name="category" className="select" defaultValue={params.category ?? ""}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="sort">
            Sort by
          </label>
          <select id="sort" name="sort" className="select" defaultValue={sort}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value} disabled={option.value === "match" && !user}>
                {option.label}
                {option.value === "match" && !user ? " (log in)" : ""}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-primary md:mb-0">
          Search
        </button>

        <div className="flex flex-wrap items-center gap-4 md:col-span-4">
          <p className="flex items-center gap-2 text-sm text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M20 6.5 9.5 17 4 11.5"
                stroke="var(--c-verify)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Everyone listed here is a verified student
          </p>

          {schools.length > 1 ? (
            <label className="flex items-center gap-2 text-sm text-muted">
              School
              <select name="school" className="select w-auto py-1.5 text-sm" defaultValue={params.school ?? ""}>
                <option value="">Any</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {hasFilters ? (
            <Link href="/browse" className="text-sm font-semibold text-brand hover:underline">
              Clear filters
            </Link>
          ) : null}
        </div>
      </form>

      {!user ? (
        <p className="notice notice-info mt-5">
          <strong>You&apos;re browsing as a guest.</strong>{" "}
          <Link href="/signup" className="underline underline-offset-2">
            Create an account
          </Link>{" "}
          to get matches ranked against your own learning list — and two credits to spend.
        </p>
      ) : null}

      <p className="nums mt-7 text-sm text-muted">
        {results.length} student{results.length === 1 ? "" : "s"}
        {sort === "match" ? ", ranked against what you want to learn" : ""}
      </p>

      {results.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon="?"
            title="Nobody matches that yet"
            body="SkillSwap is only as big as its community. Try a broader search — or list the skill yourself, so the next person looking for it finds you."
            action={
              <Link href={user ? "/dashboard/profile" : "/signup"} className="btn btn-primary">
                {user ? "Add a skill you teach" : "Join SkillSwap"}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((result) => (
            <MatchCard key={result.user.id} result={result} showReasons={Boolean(user)} />
          ))}
        </div>
      )}
    </div>
  );
}
