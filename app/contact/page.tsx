import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { ContactForm } from "@/components/feature/ContactForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Send us a message. We read every one. For your own situation, use the free legal services on the Get help page.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const t = useTranslations("contact");
  return (
    <div className="container-prose py-12 sm:py-16">
      <PageHeader kicker={t("kicker")} title={t("title")} lead={t("intro")} />
      <div className="mt-9">
        <ContactForm />
      </div>
    </div>
  );
}
