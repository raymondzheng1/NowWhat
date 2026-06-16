import type { Metadata } from "next";
import { useTranslations } from "next-intl";

export const metadata: Metadata = {
  title: "Your privacy",
  description: "We don't keep your letter or your answers. Here's how this service protects your privacy.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const t = useTranslations("privacy");
  return (
    <div className="container-prose py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-3 text-ink-soft">{t("intro")}</p>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-ink-soft">
        <li>{t("point1")}</li>
        <li>{t("point2")}</li>
        <li>{t("point3")}</li>
        <li>{t("point4")}</li>
      </ul>
    </div>
  );
}
