import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// ----------------------------------------------------------------------------
// DICTIONARY RESOLVER
// ----------------------------------------------------------------------------

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  // Extract locale from cookie, defaulting to English
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";

  return {
    locale,
    timeZone: "UTC",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
