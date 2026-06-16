import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/lib/config";

/**
 * next-intl request config (harness §10). English first; no locale routing yet, but
 * the message-catalog architecture is multilingual-ready — add a locale file + switch
 * the resolved locale here when launch languages are decided.
 */
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
