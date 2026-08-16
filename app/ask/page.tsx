import type { Metadata } from "next";
import { AskClient } from "@/components/feature/AskClient";

export const metadata: Metadata = {
  title: "Ask a question about a government decision",
  description:
    "Ask about a Commonwealth or Victorian government decision in your own words. Plain-English answers on review options and time limits, each showing its official source.",
  alternates: { canonical: "/ask" },
};

export default function AskPage() {
  return <AskClient />;
}
