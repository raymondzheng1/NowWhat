import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "What Now? gives general information about Victorian government decisions — not legal advice. Here are the terms of using this free service.",
  alternates: { canonical: "/terms" },
};

// NOTE: plain-English terms summary. A lawyer should review before public launch.
const UPDATED = "16 June 2026";

/** Section head — a hairline, then an Archivo 900 heading. Quiet editorial prose page. */
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-9 border-t border-line pt-8 text-[22px]">{children}</h2>;
}

export default function TermsPage() {
  return (
    <div className="container-prose py-12 sm:py-16">
      <PageHeader
        kicker="Terms"
        title="Terms of use"
        lead="What Now? is a free service that gives general information to help you understand a Victorian government decision. Using it means you agree to these terms."
      />

      <Disclaimer className="mt-6" />

      <div className="prose-plain mt-4 max-w-none text-ink-soft">
        <H2>Information, not legal advice</H2>
        <p className="mt-3 leading-relaxed">
          What Now? gives general information, not legal advice. Using it does not make us your
          lawyer, and we can&rsquo;t tell you what will happen in your case. For advice about your own
          situation, talk to a free legal service — see the{" "}
          <Link href="/help" className="link">Get help</Link> page.
        </p>

        <H2>Check the important dates yourself</H2>
        <p className="mt-3 leading-relaxed">
          Time limits matter, and the date that applies can depend on details of your situation. We
          show a date only when we can ground it in a verified rule, but you should confirm the exact
          deadline with a free legal service before you rely on it.
        </p>

        <H2>We try to be accurate, but no guarantees</H2>
        <p className="mt-3 leading-relaxed">
          Our answers are grounded in a curated set of sourced rules, and when we&rsquo;re not sure we
          say so rather than guess. Even so, the law changes and your situation may have details that
          change the answer. The service is provided &ldquo;as is&rdquo;, without warranties, to the
          extent allowed by law. To the extent the law allows, we are not liable for any loss arising
          from using the service. Nothing in these terms limits rights you have under the Australian
          Consumer Law that cannot be excluded.
        </p>

        <H2>Fair use</H2>
        <p className="mt-3 leading-relaxed">
          Please use the service for its purpose — understanding and responding to a government
          decision. Don&rsquo;t misuse it, try to break it, or treat it as a substitute for advice
          from a qualified person.
        </p>

        <H2>Where these terms apply</H2>
        <p className="mt-3 leading-relaxed">
          These terms are governed by the laws of Victoria, Australia.
        </p>

        <H2>Changes &amp; contact</H2>
        <p className="mt-3 leading-relaxed">
          If these terms change, we&rsquo;ll update this page. Questions? Use the{" "}
          <Link href="/contact" className="link">contact form</Link>.
        </p>

        <p className="mono mt-10 uppercase text-ink-faint">Last updated: {UPDATED}</p>
      </div>
    </div>
  );
}
