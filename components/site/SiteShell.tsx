"use client";

import { usePathname } from "next/navigation";
import { isAppRoute } from "@/components/site/appRoutes";
import { SiteNav } from "@/components/site/SiteNav";
import { Footer } from "@/components/site/Footer";
import { ChatLauncher } from "@/components/site/ChatLauncher";
import { InstallPrompt } from "@/components/site/InstallPrompt";

/**
 * Site shell (sticker album). Composes the persistent chrome around the page:
 *  - content/marketing pages: the sticker header (logo + nav + the always-visible
 *    "Talk to a person" pill), the footer, and the persistent chat launcher.
 *  - focused tool surfaces (/start, /ask, /decode, /chat): no marketing chrome and no
 *    launcher — those pages bring their own minimal header so the task stays calm.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isAppRoute(pathname)) {
    return (
      <>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <main id="main" className="flex-1">
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
      <ChatLauncher />
      <InstallPrompt />
    </>
  );
}
