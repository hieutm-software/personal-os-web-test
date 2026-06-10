"use client";

import { logoutAction } from "@/lib/actions/auth";
import { setLocaleAction } from "@/lib/actions/locale";
import { changePasswordAction } from "@/lib/actions/users";
import { getVaultItemsForMigrationAction, bulkUpdateVaultPasswordsAction } from "@/lib/actions/vault";
import { encryptClient, decryptClient } from "@/lib/crypto-client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  DatabaseBackup,
  Download,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Palette,
  ShieldAlert,
  Sun,
  Upload,
  Globe,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

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

type ThemeOption = {
  value: string;
  label: string;
  icon: React.ElementType;
};

// ============================================================================
// COMPONENT
// ============================================================================

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const [isMigratingVault, setIsMigratingVault] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  const { execute, status, result } = useAction(changePasswordAction);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmitPassword = async (data: PasswordForm) => {
    setMigrationError(null);
    setIsMigratingVault(true);
    
    try {
      // 1. Fetch vault items for migration
      const res = await getVaultItemsForMigrationAction();
      if (res?.data?.failure || !res?.data?.data) {
        setMigrationError("Failed to fetch vault items for synchronization.");
        setIsMigratingVault(false);
        return;
      }

      const items = res.data.data;
      const updatedItems = [];

      let failedDecryptionCount = 0;

      // 2. Decrypt with old password and re-encrypt with new password
      for (const item of items) {
        if (item.passwordEncrypted.startsWith("v2:")) {
          try {
            const plainPassword = await decryptClient(item.passwordEncrypted, data.currentPassword);
            const newEncrypted = await encryptClient(plainPassword, data.newPassword);
            updatedItems.push({ id: item.id, passwordEncrypted: newEncrypted });
          } catch (error) {
            // If it fails to decrypt, it was encrypted with a different password.
            // We skip it so we don't block the account password change, but we count it.
            failedDecryptionCount++;
            continue;
          }
        } else {
          // V1 items were already decrypted by the server action
          const newEncrypted = await encryptClient(item.passwordEncrypted, data.newPassword);
          updatedItems.push({ id: item.id, passwordEncrypted: newEncrypted });
        }
      }

      // 3. Bulk update vault items
      if (updatedItems.length > 0) {
        const updateRes = await bulkUpdateVaultPasswordsAction({ items: updatedItems });
        if (updateRes?.data?.failure) {
          setMigrationError("Failed to save updated vault passwords.");
          setIsMigratingVault(false);
          return;
        }
      }

      // 4. Update account password
      execute({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      // 5. Clear session storage
      sessionStorage.removeItem("personalOSVaultKey");

      if (failedDecryptionCount > 0) {
        console.warn(`${failedDecryptionCount} vault items could not be migrated because they were encrypted with a different password.`);
      }
      
    } catch (e) {
      setMigrationError("An unexpected error occurred during password synchronization.");
    } finally {
      setIsMigratingVault(false);
    }
  };

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    sessionStorage.removeItem("personalOSVaultKey");
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
    <div className="relative p-4 md:p-6 lg:p-8 min-h-full">
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-indigo-500/5 via-transparent to-transparent pointer-events-none z-0" />
      <div className="relative z-10 max-w-5xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("settingsDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* ── SECURITY CARD ──────────────────────────────────────────────── */}
          <div className="flex flex-col rounded-2xl card-aura-responsive border-premium-border shadow-2xl overflow-hidden">
            <div className="flex flex-col space-y-1 p-5 border-b border-premium-border bg-transparent">
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

            <div className="p-5 flex-1 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-none rounded-b-2xl">
              <form
                onSubmit={form.handleSubmit(onSubmitPassword)}
                className="space-y-3.5"
              >
                <FormField
                  label={t("currentPassword")}
                  error={form.formState.errors.currentPassword?.message}
                >
                  <Input
                    variant="form"
                    {...form.register("currentPassword")}
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                  />
                </FormField>

                <FormField
                  label={t("newPassword")}
                  error={form.formState.errors.newPassword?.message}
                >
                  <Input
                    variant="form"
                    {...form.register("newPassword")}
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                  />
                </FormField>

                <FormField
                  label={t("confirmPassword")}
                  error={form.formState.errors.confirmPassword?.message}
                >
                  <Input
                    variant="form"
                    {...form.register("confirmPassword")}
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                  />
                </FormField>

                {migrationError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    {migrationError}
                  </div>
                )}

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

                <Button
                  type="submit"
                  disabled={status === "executing" || isMigratingVault}
                  className="w-full h-11"
                >
                  {status === "executing" || isMigratingVault ? "Updating & Syncing Vault..." : t("updatePassword")}
                </Button>
              </form>
            </div>
          </div>

          {/* ── APPEARANCE CARD ────────────────────────────────────────────── */}
          <div className="flex flex-col rounded-2xl card-aura-responsive border-premium-border shadow-2xl overflow-hidden">
            <div className="flex flex-col space-y-1 p-5 border-b border-premium-border bg-transparent">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-indigo-500/10">
                  <Palette className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-semibold leading-none tracking-tight text-sm">
                  {t("appearance")}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                {t("appearanceDesc")}
              </p>
            </div>
            <div className="p-5 flex-1 flex flex-col gap-3 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-none rounded-b-2xl">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = mounted && theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                        : "border-white/60 dark:border-premium-border bg-white/90 dark:bg-black/20 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-premium-text hover:bg-white shadow-sm dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{opt.label}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── BACKUP CARD ────────────────────────────────────────────────── */}
          <div className="flex flex-col rounded-2xl card-aura-responsive border-premium-border shadow-2xl overflow-hidden">
            <div className="flex flex-col space-y-1 p-5 border-b border-premium-border bg-transparent">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-green-500/10">
                  <DatabaseBackup className="w-4 h-4 text-green-500" />
                </div>
                <h3 className="font-semibold leading-none tracking-tight text-sm">
                  {t("backupRestore")}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                {t("backupDesc")}
              </p>
            </div>

            <div className="p-5 space-y-5 flex-1 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-none rounded-b-2xl">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("exportDesc")}</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExport}
                  disabled={exportStatus !== null && exportStatus !== "Done!" && exportStatus !== "Export Failed"}
                >
                  <Download className="w-4 h-4" />
                  {exportStatus || t("exportBackup")}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("importDesc")}</p>
                <input
                  type="file"
                  accept=".zip"
                  ref={fileInputRef}
                  onChange={handleImport}
                  className="hidden"
                  aria-label="Import configuration file"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importStatus !== null && importStatus !== "Success! Reloading..." && importStatus !== "Import Failed"}
                >
                  <Upload className="w-4 h-4" />
                  {importStatus || t("importBackup")}
                </Button>
              </div>
            </div>
          </div>

          {/* ── LOGIN SESSIONS CARD ────────────────────────────────────────── */}
          <div className="flex flex-col rounded-2xl card-aura-responsive border-premium-border shadow-2xl overflow-hidden md:col-span-2 lg:col-span-3">
            <div className="flex flex-col space-y-1 p-5 border-b border-premium-border bg-transparent">
              <div className="flex items-center gap-2.5">
                <h3 className="font-semibold leading-none tracking-tight text-sm">
                  {t("loginSessions")}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? t("sessionsAdminDesc")
                  : t("sessionsDesc")}
              </p>
            </div>
            <div className="p-0 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-none rounded-b-2xl">
              <SessionsView sessions={allSessions} isAdmin={isAdmin} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
