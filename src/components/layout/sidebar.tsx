"use client";

import { cn } from "@/lib/utils";
import {
  Calendar,
  FileText,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Folder,
  Layers,
  CheckSquare
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
  const [isHovered, setIsHovered] = useState(false);

  // Hydrate collapsed state from localStorage after mount to avoid SSR mismatch.
  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/tasks", icon: CheckSquare, label: t("tasks") },
    { href: "/calendar", icon: Calendar, label: t("calendar") },
    { href: "/notes", icon: FileText, label: t("notes") },
    { href: "/documents", icon: Folder, label: t("documents") },
    { href: "/vault", icon: ShieldCheck, label: t("vault") },
  ];

  // We remove the !mounted check because if hydration fails elsewhere,
  // the sidebar would remain permanently empty. A small layout shift
  // is better than a broken app.

  return (
    <aside
      className={cn(
        "sidebar-glass hidden md:flex flex-col h-screen sticky top-0 shrink-0 p-3 transition-all duration-300 ease-in-out overflow-hidden select-none",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      {/* ── Logo row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center mb-6 relative min-h-[40px] mt-2">
        <Link
          href={collapsed ? "#" : "/"}
          onClick={(e) => {
            if (collapsed) {
              e.preventDefault();
              toggleCollapsed();
            }
          }}
          className={cn("flex items-center rounded-lg py-2 flex-1 transition-all duration-300", collapsed ? "px-[6px]" : "px-3")}
          title={collapsed ? "Expand sidebar" : "Personal OS — Go to Home"}
        >
          {/* Logo mark */}
          <div 
            className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 relative overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Layers className={cn("w-5 h-5 text-white transition-all duration-300", collapsed && isHovered ? "opacity-0 scale-50" : "opacity-100 scale-100")} />
            
            {/* Hover Expand Icon overlay inside the logo */}
            <div className={cn("absolute inset-0 flex items-center justify-center bg-black/30 transition-all duration-300", collapsed && isHovered ? "opacity-100 scale-100" : "opacity-0 scale-150 pointer-events-none")}>
               <PanelLeftOpen className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <div className={cn("flex flex-col transition-all duration-300 overflow-hidden", collapsed ? "w-0 opacity-0 ml-0" : "w-[120px] opacity-100 ml-3")}>
            <span className="font-bold text-base tracking-tight truncate leading-tight text-foreground">
              Personal OS
            </span>
            <span className="text-xs text-muted-foreground truncate leading-tight">
              Productivity
            </span>
          </div>
        </Link>

        {/* Collapse toggle button (only visible when expanded) */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            "p-2 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all duration-300 shrink-0 absolute right-2",
            collapsed ? "opacity-0 scale-75 pointer-events-none" : "opacity-100 scale-100"
          )}
          title="Close sidebar"
        >
          <PanelLeftClose className="w-5 h-5" />
        </button>
      </div>

      {/* ── Main navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
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
                "flex items-center gap-3 rounded-lg transition-all duration-300 text-sm font-medium py-2.5",
                collapsed ? "px-[15px]" : "px-3",
                isActive
                  ? "active-nav-item"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5",
              )}
            >
              <item.icon
                className={cn(
                  "shrink-0 transition-transform duration-150",
                  isActive ? "w-4.5 h-4.5 text-primary" : "w-4 h-4",
                  collapsed ? "" : "w-4 h-4",
                )}
                style={{ width: "1rem", height: "1rem" }}
              />
              <span className={cn("truncate transition-all duration-300", collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[150px] opacity-100")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: Settings ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "mt-auto space-y-0.5 mb-2",
        )}
      >
        {(() => {
          const isActive = pathname.startsWith("/settings");
          return (
            <Link
              href="/settings"
              title={collapsed ? t("settings") : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all duration-300 text-sm font-medium py-2.5",
                collapsed ? "px-[15px]" : "px-3",
                isActive
                  ? "active-nav-item"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5",
              )}
            >
              <Settings
                style={{ width: "1rem", height: "1rem" }}
                className={cn(
                  "shrink-0",
                  isActive ? "text-indigo-400" : ""
                )}
              />
              <span className={cn("truncate transition-all duration-300", collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[150px] opacity-100")}>{t("settings")}</span>
            </Link>
          );
        })()}
      </div>
    </aside>
  );
}
