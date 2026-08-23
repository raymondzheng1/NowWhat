import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrivacyNote } from "@/components/ui/PrivacyNote";

export const metadata: Metadata = {
  title: "Your privacy",
  description:
    "We don't keep your letter, your questions, or your answers. Here's exactly what happens to what you enter, and who helps us run the service.",
  alternates: { canonical: "/privacy" },
};

// NOTE: plain-English privacy summary. A lawyer should review before public launch.
const UPDATED = "16 June 2026";

/** Section head — a hairline, then an Archivo 900 heading. Quiet editorial prose page. */
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-9 border-t border-line pt-8 text-[22px]">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <div className="container-prose py-12 sm:py-16">
      <PageHeader
        kicker="Privacy"
        title="Your privacy"
        lead="The short version: we don’t keep your letter, your questions, or your answers. There are no accounts. Here is what we do use, and how to ask us about it."
      />

      {/* The component default still reads "NOTHING STORED", which this page now contradicts
          two sections down. Pass the content-scoped line until that default is corrected. */}
      <PrivacyNote className="mt-6 text-ink-faint">
        FREE / NO ACCOUNT / YOUR LETTER IS NOT STORED
      </PrivacyNote>

      <div className="prose-plain mt-4 max-w-none text-ink-soft">
        <H2>What we don&rsquo;t keep</H2>
        <p className="mt-3 leading-relaxed">
          When you scan, paste, or ask about a letter, we read it on the spot to work out your
          answer and then discard it. We never write your letter, photo, questions, or answers to
          a database or to our logs. One thing does stay: if you save a draft, that draft is kept
          in this browser, on this device. It stays there until you clear your browser data.
        </p>

        <H2>What we do use, and why</H2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
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
        <p className="mt-3 leading-relaxed">
          To answer your question, the text of your letter is processed by our service providers and
          then discarded, the same as on our own servers:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
          <li><strong className="text-ink">Anthropic</strong> — reads and explains the text, in the moment.</li>
          <li><strong className="text-ink">Upstash</strong> — holds the usage counters (no letter content).</li>
          <li><strong className="text-ink">Vercel</strong> — hosts the service, in Sydney, Australia.</li>
          <li><strong className="text-ink">Google Analytics</strong> — anonymous page analytics, only with your consent.</li>
          <li><strong className="text-ink">Resend</strong> — sends us your contact form message, so we can reply.</li>
        </ul>

        <H2>If you contact us</H2>
        <p className="mt-3 leading-relaxed">
          If you use the <Link href="/contact" className="link">contact form</Link>, your name, email,
          and message are emailed to us so we can reply. We don&rsquo;t store them on this site or use
          them for anything else.
        </p>

        <H2>Your control</H2>
        <p className="mt-3 leading-relaxed">
          We don&rsquo;t keep your letter or your answers, so there is nothing there to delete. Some
          other things do exist:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
          <li>the session cookie in your browser;</li>
          <li>short-lived usage counters, tied to your network address;</li>
          <li>page analytics, if you accepted them;</li>
          <li>any message you sent us through the contact form.</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          You can clear the session cookie any time by clearing your browser data. That also clears
          any draft you saved. To ask what we hold about you, or to ask us to delete it, use the{" "}
          <Link href="/contact" className="link">contact form</Link>.
        </p>

        <H2>Changes &amp; contact</H2>
        <p className="mt-3 leading-relaxed">
          If this policy changes, we&rsquo;ll update this page. Questions about privacy? Use the{" "}
          <Link href="/contact" className="link">contact form</Link>.
        </p>

        <p className="mono mt-10 uppercase text-ink-faint">Last updated: {UPDATED}</p>
      </div>
    </div>
  );
}
