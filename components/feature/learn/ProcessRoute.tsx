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

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {other && (
          <Link
            href={`/learn/${other.id}`}
            className="card sticker flex flex-col gap-2"
            style={{ "--rot": "-1.1deg" } as React.CSSProperties}
          >
            <span className="pill self-start bg-cream text-ink-soft">The other path</span>
            <p className="mt-1 font-display text-[20px] font-black text-ink">{other.name}</p>
            <p className="text-[15px] leading-[1.55] text-ink-soft">{other.oneLine}</p>
          </Link>
        )}
        <Link
          href="/learn/compare"
          className="card sticker flex flex-col gap-2"
          style={{ "--rot": "0.9deg" } as React.CSSProperties}
        >
          <span className="pill self-start bg-cream text-ink-soft">Compare</span>
          <p className="mt-1 font-display text-[20px] font-black text-ink">Merits vs judicial review</p>
          <p className="text-[15px] leading-[1.55] text-ink-soft">See them side by side and a quick guide to which fits.</p>
        </Link>
      </div>

      <LearnTrust sources={p.sources} />
    </LearnContainer>
  );
}
