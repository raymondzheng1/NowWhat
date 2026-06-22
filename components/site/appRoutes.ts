/**
 * Focused tool surfaces provide their own header (progress / start-over / close), and
 * suppress the marketing chrome + the persistent chat launcher so they don't compete
 * with the task. Single source of truth, imported by the site shell.
 */
export const APP_ROUTES = ["/start", "/ask", "/decode", "/chat"];

export function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
