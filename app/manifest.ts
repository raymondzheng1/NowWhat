import type { MetadataRoute } from "next";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/config";

/** PWA manifest (harness §19) — installable app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
    short_name: PRODUCT_NAME,
    description:
      "Free, plain-English help to understand a government decision and respond to it.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#1b3a5b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
