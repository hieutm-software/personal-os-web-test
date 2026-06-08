"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Strictly Server Action-based locale switching to avoid Client Component cookie manipulations.
 */
export async function setLocaleAction(locale: "en" | "vi") {
  const cookieStore = await cookies();

  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 31536000, // 1 year
    sameSite: "lax",
  });

  // Revalidate the root layout cache to reflect dictionary changes globally
  revalidatePath("/", "layout");
}
