"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

interface ShellProps {
  children: ReactNode;
  isAuthenticated: boolean;
}

export function Shell({ children, isAuthenticated }: ShellProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login";

  // Unauthenticated or login page: full-screen, no chrome
  if (!isAuthenticated || isAuthRoute) {
    return <main className="flex min-h-screen flex-col">{children}</main>;
  }

  // Authenticated shell: sidebar + mobile header + scrollable content area.
  // Each page component is responsible for its own interior layout.
  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-muted/20">
      {/* Desktop sticky sidebar */}
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile-only hamburger header */}
        <MobileNav />

        {/* Scrollable main content — pages own their own inner layout */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
