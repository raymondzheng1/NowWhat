/**
 * JSON-LD structured data (harness §8). Server component — emits a ld+json script.
 * Use for WebSite / Organization / FAQPage / BreadcrumbList nodes.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Data is built from trusted, static values — never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
