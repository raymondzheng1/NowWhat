import type { Metadata } from "next";
import { AskClient } from "@/components/feature/AskClient";

export const metadata: Metadata = {
  title: "Ask a question",
  description:
    "Ask about a government decision in plain English. Grounded, plain-language answers that show where they come from.",
  alternates: { canonical: "/ask" },
};

export default function AskPage() {
  return <AskClient />;
}
