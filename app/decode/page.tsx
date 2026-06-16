import type { Metadata } from "next";
import { DecodeClient } from "@/components/feature/DecodeClient";

export const metadata: Metadata = {
  title: "Scan or paste a letter",
  description:
    "Scan, upload, or paste a government decision letter and get a plain-English explanation, the review pathway, and the time limit. We never keep your letter.",
  alternates: { canonical: "/decode" },
};

export default function DecodePage() {
  return <DecodeClient />;
}
