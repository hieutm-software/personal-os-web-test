import { verifySessionToken } from "@/lib/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ============================================================================
// CONSTANTS
// ============================================================================

const PUBLIC_ROUTES = new Set(["/login"]);
const ADMIN_ROUTES = ["/settings/admin"];
const BYPASS_ROUTES = ["/_next", "/favicon.ico", "/api/cron"];

// ============================================================================
// MIDDLEWARE LOGIC
// ============================================================================

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static assets, internals, and specialized system routes (e.g., cron)
  if (BYPASS_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const token = request.cookies.get("session")?.value;
  const payload = token ? await verifySessionToken(token) : null;

  // 2. Unauthenticated state handling
  if (!payload) {
    if (!isPublicRoute) {
      // Redirect to login if attempting to access a protected route
      const redirectUrl = new URL("/login", request.url);
      const response = NextResponse.redirect(redirectUrl);

      // If a token existed but failed verification (expired/tampered), purge it
      if (token) {
        response.cookies.delete("session");
      }
      return response;
    }
    // Allow access to public routes (e.g., /login) if not authenticated
    return NextResponse.next();
  }

  // 3. Authenticated state handling
  if (payload) {
    // Prevent authenticated users from accessing login page
    if (isPublicRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 4. Role-Based Access Control (RBAC) enforcement
    const isAttemptingAdminRoute = ADMIN_ROUTES.some((route) =>
      pathname.startsWith(route),
    );
    if (isAttemptingAdminRoute && payload.role !== "ADMIN") {
      // Kick standard users back to settings if they try to access admin panel
      return NextResponse.redirect(new URL("/settings", request.url));
    }
  }

  return NextResponse.next();
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
