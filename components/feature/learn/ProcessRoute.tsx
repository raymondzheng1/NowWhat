import Link from "next/link";
import type { ReviewKind } from "@/lib/schemas/legal";
import { getProcess } from "@/lib/legal";
import { ProcessExplainer } from "@/components/feature/learn/ProcessExplainer";
import { LearnContainer } from "@/components/feature/learn/LearnContainer";
import { LearnTrust } from "@/components/feature/learn/LearnTrust";
import { JsonLd } from "@/components/site/JsonLd";
import { articleLd } from "@/lib/seo/jsonld";

/** Full library page body for one process — shared by the two process routes. */
export function ProcessRoute({ id }: { id: ReviewKind }) {
  const p = getProcess(id);
  if (!p) return null;
  const otherId: ReviewKind = id === "merits-review" ? "judicial-review" : "merits-review";
  const other = getProcess(otherId);

  return (
    <LearnContainer
      breadcrumb={[
        { name: "Home", href: "/" },
        { name: "How review works", href: "/learn" },
        { name: p.name, href: `/learn/${p.id}` },
      ]}
    >
      <JsonLd
        data={articleLd({
          headline: `${p.name} explained`,
          description: p.oneLine,
          path: `/learn/${p.id}`,
          section: "How review works",
        })}
      />
      <ProcessExplainer process={p} level="h1" />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {other && (
          <Link href={`/learn/${other.id}`} className="rounded-card border border-line bg-paper p-5 hover:border-rail-accent">
            <p className="text-[11px] uppercase tracking-[0.16em] text-accent">The other path</p>
            <p className="mt-1 font-display text-[20px] font-semibold text-ink">{other.name}</p>
            <p className="mt-1 text-[14px] text-ink-soft">{other.oneLine}</p>
          </Link>
        )}
        <Link href="/learn/compare" className="rounded-card border border-line bg-sand-surface p-5 hover:border-rail-accent">
          <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Compare</p>
          <p className="mt-1 font-display text-[20px] font-semibold text-ink">Merits vs judicial review</p>
          <p className="mt-1 text-[14px] text-ink-soft">See them side by side and a quick guide to which fits.</p>
        </Link>
      </div>

      <LearnTrust sources={p.sources} />
    </LearnContainer>
  );
}
