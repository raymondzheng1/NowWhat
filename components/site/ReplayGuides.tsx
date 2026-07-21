"use client";

import { useState } from "react";
import { replayAllTours } from "@/components/feature/tour/useTour";
import { useTranslations } from "next-intl";

/**
 * "Replay the guides" — the support answer when someone dismissed a walkthrough and wants it
 * back (harness §14.11: once each, escapable, replayable). Clearing the flags means each
 * screen's guide fires again the next time that screen is opened.
 */
export function ReplayGuides({ className = "" }: { className?: string }) {
  const t = useTranslations("tour");
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        replayAllTours();
        setDone(true);
        window.setTimeout(() => setDone(false), 2500);
      }}
    >
      {done ? t("replayDone") : t("replayAll")}
    </button>
  );
}
