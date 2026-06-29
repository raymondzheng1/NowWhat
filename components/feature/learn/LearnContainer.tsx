import Link from "next/link";

/** Shared shell for Learn pages — the content column + an optional "back" link. */
export function LearnContainer({
  children,
  back,
}: {
  children: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="container-wide py-8 sm:py-12">
      {back && (
        <Link href={back.href} className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent hover:text-ink">
          ← {back.label}
        </Link>
      )}
      <div className={back ? "mt-5" : ""}>{children}</div>
    </div>
  );
}
