import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { ContactForm } from "@/components/feature/ContactForm";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Send us a message. We read every one. For your own situation, use the free legal services on the Get help page.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const t = useTranslations("contact");
  return (
    <div className="container-prose py-10">
      <h1 className="font-serif text-h1 font-bold text-navy-ink">{t("title")}</h1>
      <p className="mt-2 mb-6 text-ink-soft">{t("intro")}</p>
      <ContactForm />
    </div>
  );
}
