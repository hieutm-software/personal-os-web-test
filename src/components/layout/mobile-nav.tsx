"use client";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Calendar,
  FileText,
  Home,
  LayoutDashboard,
  Menu,
  Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
};

export function MobileNav() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the sheet automatically when the route changes.
  // setState here is intentional: this effect subscribes to the router's external
  // pathname state and syncs it into local sheet-open UI state — the canonical
  // "subscribe to an external system" use case for useEffect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = [
    { href: "/", icon: Home, label: t("home"), exact: true },
    { href: "/tasks", icon: LayoutDashboard, label: t("tasks") },
    { href: "/calendar", icon: Calendar, label: t("calendar") },
    { href: "/notes", icon: FileText, label: t("notes") },
    { href: "/settings", icon: Settings, label: t("settings") },
  ];

  return (
    <div className="md:hidden flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 py-3 shrink-0">
      {/* Clickable logo routes to Home */}
      <Link
        href="/"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        aria-label="Personal OS — Go to Home"
      >
        <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold tracking-tighter shadow-sm">
          OS
        </div>
        <span className="font-semibold tracking-tight">Personal_OS</span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <button
          onClick={() => setOpen(true)}
          className="p-2 -mr-2 text-muted-foreground hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </button>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
          {/* Sheet header with logo */}
          <div className="flex items-center gap-3 px-4 py-6 border-b border-border">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold tracking-tighter shadow-sm">
              OS
            </div>
            <SheetTitle className="font-semibold text-lg tracking-tight">
              Personal_OS
            </SheetTitle>
          </div>

          <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium relative",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                  )}
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
