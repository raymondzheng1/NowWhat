import type { Metadata } from "next";
import { ChatClient } from "@/components/feature/ChatClient";

export const metadata: Metadata = {
  title: "Chat it through",
  description:
    "Prefer to talk it through? Describe your government decision in your own words and we'll route you to the right guide, the time limit, and free help. Nothing is stored.",
  alternates: { canonical: "/chat" },
};

export default function ChatPage() {
  return <ChatClient />;
}
