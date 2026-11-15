import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-[2.5rem]">This page isn&apos;t on the exchange</h1>
      <p className="mt-3 max-w-md leading-relaxed text-muted">
        The link may be old, or the student may have changed their profile address.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/browse" className="btn btn-primary">
          Find a teacher
        </Link>
        <Link href="/" className="btn btn-ghost">
          Back to the start
        </Link>
      </div>
    </div>
  );
}
