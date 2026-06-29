import Link from "next/link";
import { JsonLd } from "@/components/site/JsonLd";
import { breadcrumbLd } from "@/lib/seo/jsonld";

/**
 * Shared shell for Learn pages — the content column + a visible breadcrumb trail that
 * matches the emitted BreadcrumbList structured data (SEO best practice: the visible
 * breadcrumb and the markup agree). The last crumb is the current page (not linked).
 */
export function LearnContainer({
  children,
  breadcrumb,
}: {
  children: React.ReactNode;
  breadcrumb?: { name: string; href: string }[];
}) {
  const trail = breadcrumb ?? [];
  return (
    <div className="container-wide py-8 sm:py-12">
      {trail.length > 0 && (
        <>
          <JsonLd data={breadcrumbLd(trail.map((b) => ({ name: b.name, path: b.href })))} />
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-[12px] uppercase tracking-[0.1em] text-ink-faint"
          >
            {trail.map((b, i) => {
              const last = i === trail.length - 1;
              return (
                <span key={b.href} className="flex items-center gap-1.5">
                  {last ? (
                    <span className="text-ink-soft">{b.name}</span>
                  ) : (
                    <Link href={b.href} className="text-accent hover:text-ink">{b.name}</Link>
                  )}
                  {!last && <span aria-hidden="true">/</span>}
                </span>
              );
            })}
          </nav>
        </>
      )}
      <div className={trail.length > 0 ? "mt-5" : ""}>{children}</div>
    </div>
  );
}
