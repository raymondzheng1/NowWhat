import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const metadata: Metadata = {
  title: "Your privacy",
  description:
    "We don't keep your letter, your questions, or your answers. Here's exactly what happens to what you enter, and who helps us run the service.",
  alternates: { canonical: "/privacy" },
};

// NOTE: plain-English privacy summary. A lawyer should review before public launch.
const UPDATED = "16 June 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 font-serif text-h3 font-bold text-ink">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <div className="container-prose py-10">
      <Eyebrow>Privacy</Eyebrow>
      <h1 className="mt-3 font-serif text-h1 font-bold text-navy-ink">Your privacy</h1>
      <p className="mt-3 text-lead text-ink-soft">
        The short version: we don&rsquo;t keep your letter, your questions, or your answers. There
        are no accounts, and there is nothing about you for us to store.
      </p>

      <div className="prose-plain mt-2 max-w-none text-ink-soft">
        <H2>What we don&rsquo;t keep</H2>
        <p className="mt-2 leading-relaxed">
          When you scan, paste, or ask about a letter, we read it on the spot to work out your
          answer and then discard it. We never write your letter, photo, questions, or answers to
          a database or to our logs. If you close the tab, it&rsquo;s gone.
        </p>

        <H2>What we do use, and why</H2>
        <ul className="mt-2 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong className="text-ink">A short session id</strong> (a cookie) — only to count
            free usage so we can keep the service free and prevent abuse. It is not used to track
            you across the web.
          </li>
          <li>
            <strong className="text-ink">Usage counters</strong> — we count requests by session and
            by network address to apply the free limit. These counters hold no content from your
            letter.
          </li>
          <li>
            <strong className="text-ink">Anonymous analytics</strong> — only if you accept them. We
            measure page visits to improve the service, and we never send your letter, questions, or
            answers to analytics.
          </li>
        </ul>

        <H2>Who helps us run it</H2>
        <p className="mt-2 leading-relaxed">
          To answer your question, the text of your letter is processed by our service providers and
          then discarded — the same as on our own servers, they do not keep it to train on:
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5 leading-relaxed">
          <li><strong className="text-ink">Anthropic</strong> — reads and explains the text, in the moment.</li>
          <li><strong className="text-ink">Upstash</strong> — holds the usage counters (no letter content).</li>
          <li><strong className="text-ink">Vercel</strong> — hosts the service, in Sydney, Australia.</li>
          <li><strong className="text-ink">Google Analytics</strong> — anonymous page analytics, only with your consent.</li>
        </ul>

        <H2>If you contact us</H2>
        <p className="mt-2 leading-relaxed">
          If you use the <Link href="/contact" className="link">contact form</Link>, your name, email,
          and message are emailed to us so we can reply. We don&rsquo;t store them on this site or use
          them for anything else.
        </p>

        <H2>Your control</H2>
        <p className="mt-2 leading-relaxed">
          Because we don&rsquo;t keep your letter or answers, there is nothing to ask us to delete.
          You can clear the session cookie any time by clearing your browser data.
        </p>

        <H2>Changes &amp; contact</H2>
        <p className="mt-2 leading-relaxed">
          If this policy changes, we&rsquo;ll update this page. Questions about privacy? Use the{" "}
          <Link href="/contact" className="link">contact form</Link>.
        </p>

        <p className="mt-8 text-meta text-ink-faint">Last updated: {UPDATED}</p>
      </div>
    </div>
  );
}
