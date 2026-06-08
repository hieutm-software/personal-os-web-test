"use client";

import { cn } from "@/lib/utils";
import {
  Calendar,
  FileText,
  Home,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Folder
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
};

// ---------------------------------------------------------------------------
// SIDEBAR COMPONENT
// - Collapsible (icon-only) / Expanded (icon + label)
// - Settings link pinned to the bottom
// - Collapse state persisted to localStorage
// ---------------------------------------------------------------------------

const COLLAPSED_KEY = "personal-os-sidebar-collapsed";

export function Sidebar() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Hydrate collapsed state from localStorage after mount to avoid SSR mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const saved = localStorage.getItem(COLLAPSED_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const navItems: NavItem[] = [
    { href: "/", icon: Home, label: t("home"), exact: true },
    { href: "/tasks", icon: LayoutDashboard, label: t("tasks") },
    { href: "/calendar", icon: Calendar, label: t("calendar") },
    { href: "/notes", icon: FileText, label: t("notes") },
    { href: "/documents", icon: Folder, label: t("documents") },
    { href: "/vault", icon: ShieldCheck, label: t("vault") },
  ];

  // Suppress flash-of-wrong-width on first render
  if (!mounted) {
    return (
      <aside className="sidebar-glass hidden md:flex flex-col w-64 h-screen sticky top-0 shrink-0 p-3" />
    );
  }

  return (
    <aside
      className={cn(
        "sidebar-glass hidden md:flex flex-col h-screen sticky top-0 shrink-0 p-3 transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* ── Logo row ──────────────────────────────────────────────────────── */}
      <div className={cn("flex items-center mb-4 px-1", collapsed ? "justify-center mt-1" : "justify-between")}>
        {!collapsed && (
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg hover:bg-secondary/60 transition-colors group overflow-hidden min-w-0 py-1.5 px-1.5 flex-1"
            aria-label="Personal OS — Go to Home"
          >
            {/* Logo mark */}
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs tracking-tighter group-hover:scale-105 transition-transform shrink-0 shadow-sm">
              OS
            </div>
            <span className="font-semibold text-base tracking-tight truncate">
              Personal_OS
            </span>
          </Link>
        )}

        {/* Collapse toggle button */}
        <button
          onClick={toggleCollapsed}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "p-2 rounded-md text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-150 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed ? "" : "ml-1",
          )}
          title={collapsed ? "Expand sidebar" : "Close sidebar"}
        >
          {collapsed ? (
            isHovered ? (
              <div className="h-8 w-8 flex items-center justify-center">
                <PanelLeftOpen className="w-6 h-6" />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm mx-auto">
                OS
              </div>
            )
          ) : isHovered ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* ── Main navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all duration-150 text-sm font-medium relative group px-3 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
              )}
              <item.icon
                className={cn(
                  "shrink-0 transition-transform duration-150",
                  isActive ? "w-4.5 h-4.5 text-primary" : "w-4 h-4",
                  collapsed ? "" : "w-4 h-4",
                )}
                style={{ width: "1rem", height: "1rem" }}
              />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: Settings ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "mt-auto space-y-0.5",
        )}
      >
        {(() => {
          const isActive = pathname.startsWith("/settings");
          return (
            <Link
              href="/settings"
              title={collapsed ? t("settings") : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all duration-150 text-sm font-medium relative px-3 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
              )}
              <Settings
                style={{ width: "1rem", height: "1rem" }}
                className="shrink-0"
              />
              {!collapsed && (
                <span className="truncate">{t("settings")}</span>
              )}
            </Link>
          );
        })()}
      </div>
    </aside>
  );
}
