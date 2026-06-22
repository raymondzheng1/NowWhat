"use client";

import { usePathname } from "next/navigation";
import { isAppRoute } from "@/components/site/appRoutes";
import { Rail } from "@/components/site/Rail";
import { SiteNav } from "@/components/site/SiteNav";
import { Footer } from "@/components/site/Footer";
import { ChatLauncher } from "@/components/site/ChatLauncher";

/**
 * Site shell (Direction K2). Composes the persistent chrome around the page:
 *  - content/marketing pages: fixed teal rail (desktop) + top bar/nav (mobile), the main
 *    column offset by the rail width, the footer, and the persistent chat launcher.
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
      <Rail />
      <div className="flex min-h-screen flex-col md:ml-rail">
        <SiteNav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
      <ChatLauncher />
    </>
  );
}
