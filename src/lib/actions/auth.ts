"use server";

import { validateCredentials } from "@/lib/auth";
import { createSafeActionClient } from "next-safe-action";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

// Initialize the safe action client
const actionClient = createSafeActionClient();

// Shared validation schema for the action and client form
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const loginAction = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput: { username, password } }) => {
    // SECURITY: Artificial delay (1.5s) to mitigate brute-force and timing attacks
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Extract session metadata
    const headerStore = await headers();
    const device = headerStore.get("user-agent") || "Unknown Device";
    const ip =
      headerStore.get("x-forwarded-for") ||
      headerStore.get("x-real-ip") ||
      "Unknown IP";
    const city = headerStore.get("x-vercel-ip-city");
    const country = headerStore.get("x-vercel-ip-country");
    
    let location = city && country ? `${city}, ${country}` : "Unknown Location";
    if (process.env.NODE_ENV === "development" && (ip === "::1" || ip === "127.0.0.1")) {
      location = "Localhost (Development)";
    }
    const result = await validateCredentials(username, password, {
      device,
      ip,
      location,
    });

    if (result.error || !result.token) {
      return { failure: "Invalid username or password. Please try again." };
    }

    // Next.js 16 requires awaiting cookies()
    const cookieStore = await cookies();

    // Set Edge-compatible secure HTTP-only cookie
    cookieStore.set("session", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days expiration
    });

    // Native Next.js server redirect to the protected dashboard (Home)
    redirect("/");
  });

// ---------------------------------------------------------------------------
// LOGOUT ACTION
// Clears the HTTP-only session cookie and redirects to /login.
// Must be called from a Server Action context (form action or server action).
// ---------------------------------------------------------------------------
export async function logoutAction(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
