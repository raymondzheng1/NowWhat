import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "What Now? gives general information about Victorian government decisions — not legal advice. Here are the terms of using this free service.",
  alternates: { canonical: "/terms" },
};

// NOTE: plain-English terms summary. A lawyer should review before public launch.
const UPDATED = "16 June 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 font-serif text-h3 font-bold text-ink">{children}</h2>;
}

export default function TermsPage() {
  return (
    <div className="container-prose py-10">
      <Eyebrow>Terms</Eyebrow>
      <h1 className="mt-3 font-serif text-h1 font-bold text-navy-ink">Terms of use</h1>
      <p className="mt-3 text-lead text-ink-soft">
        What Now? is a free service that gives general information to help you understand a Victorian
        government decision. Using it means you agree to these terms.
      </p>

      <Disclaimer className="mt-5" />

      <div className="prose-plain mt-2 max-w-none text-ink-soft">
        <H2>Information, not legal advice</H2>
        <p className="mt-2 leading-relaxed">
          What Now? gives general information, not legal advice. Using it does not make us your
          lawyer, and we can&rsquo;t tell you what will happen in your case. For advice about your own
          situation, talk to a free legal service — see the{" "}
          <Link href="/help" className="link">Get help</Link> page.
        </p>

        <H2>Check the important dates yourself</H2>
        <p className="mt-2 leading-relaxed">
          Time limits matter, and the date that applies can depend on details of your situation. We
          show a date only when we can ground it in a verified rule, but you should confirm the exact
          deadline with a free legal service before you rely on it.
        </p>

        <H2>We try to be accurate, but no guarantees</H2>
        <p className="mt-2 leading-relaxed">
          Our answers are grounded in a curated set of sourced rules, and when we&rsquo;re not sure we
          say so rather than guess. Even so, the law changes and your situation may have details that
          change the answer. The service is provided &ldquo;as is&rdquo;, without warranties, to the
          extent allowed by law. To the extent the law allows, we are not liable for any loss arising
          from using the service. Nothing in these terms limits rights you have under the Australian
          Consumer Law that cannot be excluded.
        </p>

        <H2>Fair use</H2>
        <p className="mt-2 leading-relaxed">
          Please use the service for its purpose — understanding and responding to a government
          decision. Don&rsquo;t misuse it, try to break it, or treat it as a substitute for advice
          from a qualified person.
        </p>

        <H2>Where these terms apply</H2>
        <p className="mt-2 leading-relaxed">
          These terms are governed by the laws of Victoria, Australia.
        </p>

        <H2>Changes &amp; contact</H2>
        <p className="mt-2 leading-relaxed">
          If these terms change, we&rsquo;ll update this page. Questions? Use the{" "}
          <Link href="/contact" className="link">contact form</Link>.
        </p>

        <p className="mt-8 text-meta text-ink-faint">Last updated: {UPDATED}</p>
      </div>
    </div>
  );
}
