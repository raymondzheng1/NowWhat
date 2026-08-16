import type { MetadataRoute } from "next";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/config";

/** PWA manifest (harness §19) — installable app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
    short_name: PRODUCT_NAME,
    description:
      "Free, plain-English help to understand a government decision and respond to it.",
    // `id` pins the app's identity: without it the identity is start_url, so changing the
    // landing route would orphan every installed copy.
    id: "/",
    start_url: "/",
    scope: "/",
    lang: "en-AU",
    dir: "ltr",
    display: "standalone",
    // These were still the retired K2 teal/sand and matched nothing on screen. The Android
    // status bar and the splash now match the paper the site is actually printed on.
    background_color: "#F6EDD9",
    theme_color: "#F6EDD9",
    categories: ["utilities", "education"],
    icons: [
      { src: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      // 512 satisfies Chrome's "at least 192px" installability rule.
      { src: "/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // KNOWN LIMITATION: this is the rounded icon, so an Android launcher that crops a
      // maskable icon will shave its corners. A full-bleed 512 needs an image pipeline we
      // do not have in-repo; tracked rather than faked.
      { src: "/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
