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
  const isPublicRoute = pathname === "/login" || pathname === "/";

  // Unauthenticated or public page: full-screen, no chrome
  if (!isAuthenticated || isPublicRoute) {
    return <>{children}</>;
  }

  // Authenticated shell: sidebar + mobile header + scrollable content area.
  // Each page component is responsible for its own interior layout.
  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-200 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50 relative selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -left-[20%] -top-[20%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full">
        {/* Desktop sticky sidebar */}
        <Sidebar />

        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white/40 dark:bg-black/40 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.5)] border-l border-premium-border rounded-tl-2xl mt-2 md:mt-0 md:ml-0 md:rounded-l-2xl backdrop-blur-3xl">
          {/* Mobile-only hamburger header */}
          <MobileNav />

          {/* Scrollable main content — pages own their own inner layout */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
