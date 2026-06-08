"use client";

import { logoutAction } from "@/lib/actions/auth";
import { setLocaleAction } from "@/lib/actions/locale";
import { changePasswordAction } from "@/lib/actions/users";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Download,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Palette,
  ShieldAlert,
  Sun,
  Upload,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

// ============================================================================
// TYPES
// ============================================================================

// ============================================================================
// THEME OPTION TYPE
// ============================================================================

type ThemeOption = {
  value: string;
  label: string;
  icon: React.ElementType;
};

// ============================================================================
// COMPONENT
// ============================================================================

import { AdminDialog } from "./admin-dialog";
import { SessionsView } from "./sessions-view";

type SettingsUser = { id: string; username: string; role: "USER" | "ADMIN"; createdAt: string };
type SessionItem = { id: string; userId: string; device: string | null; ip: string | null; location: string | null; loginAt: string; username?: string | null };

export default function SettingsClient({
  isAdmin,
  allUsers,
  allSessions,
  currentUserId,
}: {
  isAdmin: boolean;
  allUsers: SettingsUser[];
  allSessions: SessionItem[];
  currentUserId: string;
}) {
  const t = useTranslations("Settings");
  const tCommon = useTranslations("Common");

  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { execute, status, result } = useAction(changePasswordAction);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmitPassword = (data: PasswordForm) => {
    execute({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    await logoutAction();
  }, []);

  useEffect(() => {
    if (result.data?.success) {
      const timer = setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [result.data?.success]);

  // --------------------------------------------------------------------------
  // BROWSER FILE API LOGIC
  // --------------------------------------------------------------------------

  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setExportStatus("Compressing...");
      const response = await fetch("/api/backup/export");
      if (!response.ok) throw new Error("Failed to export backup");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `personal_os_backup_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus("Done!");
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error(error);
      setExportStatus("Export Failed");
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus("Restoring...");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/backup/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to import backup");
      }

      setImportStatus("Success! Reloading...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error(error);
      setImportStatus("Import Failed");
      setTimeout(() => setImportStatus(null), 3000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --------------------------------------------------------------------------
  // THEME OPTIONS
  // --------------------------------------------------------------------------

  const themeOptions: ThemeOption[] = [
    { value: "system", label: tCommon("system"), icon: Monitor },
    { value: "light", label: tCommon("light"), icon: Sun },
    { value: "dark", label: tCommon("dark"), icon: Moon },
  ];

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("settingsDesc")}
          </p>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* ── SECURITY CARD ──────────────────────────────────────────────── */}
          <div className="flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-[var(--card-shadow)] overflow-hidden">
            <div className="flex flex-col space-y-1 p-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <KeyRound className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold leading-none tracking-tight text-sm">
                  {t("security")}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground pl-8">{t("changePassword")}</p>
            </div>

            <div className="p-5 flex-1">
              <form
                onSubmit={form.handleSubmit(onSubmitPassword)}
                className="space-y-3.5"
              >
                <div className="space-y-1">
                  <label className="text-xs font-medium leading-none text-foreground/80">
                    {t("currentPassword")}
                  </label>
                  <input
                    {...form.register("currentPassword")}
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  />
                  {form.formState.errors.currentPassword && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium leading-none text-foreground/80">
                    {t("newPassword")}
                  </label>
                  <input
                    {...form.register("newPassword")}
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  />
                  {form.formState.errors.newPassword && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium leading-none text-foreground/80">
                    {t("confirmPassword")}
                  </label>
                  <input
                    {...form.register("confirmPassword")}
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {result.data?.failure && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    {result.data.failure}
                  </div>
                )}

                {result.data?.success && (
                  <div className="flex flex-col gap-1 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 dark:text-green-400 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {t("passwordSuccess")}
                    </div>
                    <p className="pl-5 opacity-80">Logging out all sessions...</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "executing"}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "executing" ? t("updating") : t("updatePassword")}
                </button>
              </form>
            </div>
          </div>

          {/* ── APPEARANCE CARD ────────────────────────────────────────────── */}
          <div className="flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-[var(--card-shadow)] overflow-hidden">
            <div className="flex flex-col space-y-1 p-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Palette className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold leading-none tracking-tight text-sm">
                  {t("appearance")}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                {t("appearanceDesc")}
              </p>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Theme selector — Premium toggle group */}
              <div className="space-y-2">
                <label className="text-xs font-medium leading-none text-foreground/80">
                  {tCommon("theme")}
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-muted/60 border border-border">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      id={`theme-${value}`}
                      type="button"
                      onClick={() => setTheme(value)}
                      className={`flex flex-col items-center gap-1.5 rounded-md py-2.5 px-1 text-xs font-medium transition-all duration-150 ${
                        theme === value
                          ? "bg-background text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium leading-none text-foreground/80">
                  {tCommon("language")}
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted/60 border border-border">
                  <button
                    type="button"
                    onClick={() => setLocaleAction("en")}
                    className={`flex items-center justify-center rounded-md py-2 text-xs font-medium transition-all duration-150 ${
                      locale === "en"
                        ? "bg-background text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocaleAction("vi")}
                    className={`flex items-center justify-center rounded-md py-2 text-xs font-medium transition-all duration-150 ${
                      locale === "vi"
                        ? "bg-background text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  >
                    Tiếng Việt
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── BACKUP CARD ────────────────────────────────────────────────── */}
          <div className="flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-[var(--card-shadow)] overflow-hidden">
            <div className="flex flex-col space-y-1 p-5 border-b border-border bg-muted/30">
              <h3 className="font-semibold leading-none tracking-tight text-sm">
                Backup & Restore
              </h3>
              <p className="text-xs text-muted-foreground">
                Export or restore your entire system data (Tasks, Calendar, Notes, Vault, Documents) as a ZIP file.
              </p>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Export */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Download a complete backup of your Personal OS data.</p>
                <button
                  onClick={handleExport}
                  disabled={exportStatus !== null && exportStatus !== "Done!" && exportStatus !== "Export Failed"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Download className="w-4 h-4" />
                  {exportStatus || "Export Full Backup"}
                </button>
              </div>

              {/* Import */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Upload a previously exported backup .zip file to restore data.</p>
                <input
                  type="file"
                  accept=".zip"
                  ref={fileInputRef}
                  onChange={handleImport}
                  className="hidden"
                  aria-label="Import configuration file"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importStatus !== null && importStatus !== "Success! Reloading..." && importStatus !== "Import Failed"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Upload className="w-4 h-4" />
                  {importStatus || "Import Backup"}
                </button>
              </div>
            </div>
          </div>

          {/* ── ACCOUNT / LOGOUT CARD ──────────────────────────────────────── */}
          <div className="flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-[var(--card-shadow)] overflow-hidden md:col-span-2 lg:col-span-3">
            <div className="flex flex-col space-y-1 p-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-destructive/10">
                  <LogOut className="w-4 h-4 text-destructive" />
                </div>
                <h3 className="font-semibold leading-none tracking-tight text-sm">
                  {t("account")}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                {t("accountDesc")}
              </p>
            </div>

            <div className="p-5 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground max-w-md">
                {t("logoutDesc")}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-2.5 text-sm font-semibold text-destructive shadow-sm transition-all hover:bg-destructive hover:text-destructive-foreground hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {isLoggingOut ? t("loggingOut") : t("logout")}
              </button>
            </div>
          </div>

          {/* ── ADMIN OPTIONS & SESSIONS ───────────────────────────────────────── */}
          {isAdmin && (
            <div className="flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-[var(--card-shadow)] overflow-hidden md:col-span-2 lg:col-span-3">
              <div className="flex flex-col space-y-1 p-5 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <ShieldAlert className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold leading-none tracking-tight text-sm">
                    {t("administration") || "Administration"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground pl-8">
                  {t("adminDesc") || "Manage users and system settings"}
                </p>
              </div>

              <div className="p-5 flex items-center gap-4">
                <AdminDialog allUsers={allUsers} currentUserId={currentUserId} />
              </div>
            </div>
          )}

          {/* ── LOGIN SESSIONS CARD ────────────────────────────────────────── */}
          <div className="flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-[var(--card-shadow)] overflow-hidden md:col-span-2 lg:col-span-3">
            <div className="flex flex-col space-y-1 p-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <h3 className="font-semibold leading-none tracking-tight text-sm">
                  {t("loginSessions") || "Login Sessions"}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? "Recent login activity for all users across the platform."
                  : "Recent login activity for your account."}
              </p>
            </div>
            <div className="p-0">
              <SessionsView sessions={allSessions} isAdmin={isAdmin} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
