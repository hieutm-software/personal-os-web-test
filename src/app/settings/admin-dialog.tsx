"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/data-table";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { createUserAction, deleteUserAction } from "@/lib/actions/admin";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, PlusCircle, ShieldAlert, Trash2, UserPlus, Users, X, User, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type UserData = {
  id: string;
  username: string;
  role: "USER" | "ADMIN";
  createdAt: string;
};

const createSchema = z.object({
  username: z.string().min(1, "Required"),
  password: z.string().min(8, "Minimum 8 chars"),
  role: z.enum(["USER", "ADMIN"]),
  sudoPassword: z.string().min(1, "Required"),
});

type CreateForm = z.infer<typeof createSchema>;

export function AdminDialog({
  allUsers,
  currentUserId,
}: {
  allUsers: UserData[];
  currentUserId: string;
}) {
  const t = useTranslations("Admin");
  const [open, setOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [sudoForDelete, setSudoForDelete] = useState("");

  const {
    execute: execCreate,
    status: createStatus,
    result: createResult,
    reset: resetCreate,
  } = useAction(createUserAction);
  const {
    execute: execDelete,
    status: deleteStatus,
    result: deleteResult,
    reset: resetDelete,
  } = useAction(deleteUserAction);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "USER",
      sudoPassword: "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedRole = form.watch("role");

  const onSubmitCreate = (data: CreateForm) => {
    execCreate(data);
    if (createResult.data?.success) {
      form.reset({ ...data, password: "", sudoPassword: "" });
      setTimeout(() => {
        resetCreate();
        setIsCreateOpen(false);
      }, 1500);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget && sudoForDelete) {
      execDelete({ userId: deleteTarget, sudoPassword: sudoForDelete });
      setSudoForDelete("");
      setDeleteTarget(null);
      setTimeout(resetDelete, 3000);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]">
            <Users className="w-4 h-4" />
            {t("manageUsers") || "Manage Users"}
          </button>
        </DialogTrigger>
        <DialogContent hideClose className="max-w-6xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border">
          <DialogHeader className="p-4 border-b border-border bg-muted/10 shrink-0 flex flex-row items-center justify-between space-y-0">
            <div className="flex flex-col space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl tracking-tight">
                <ShieldAlert className="w-5 h-5 text-primary" />
                {t("title") || "Admin Control Panel"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                {t("adminDesc") || "Manage users, permissions, and sensitive system settings."}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3 pr-2">
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <PlusCircle className="w-4 h-4" />
                <span>{t("createUser") || "New User"}</span>
              </Button>
              <DialogClose className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground opacity-70 transition-all hover:bg-destructive hover:text-destructive-foreground hover:opacity-100 focus:outline-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-background">
            <TableContainer className="h-full overflow-x-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t("username") || "Username"}</TableHead>
                    <TableHead className="w-[120px] min-w-[120px]">{t("role") || "Role"}</TableHead>
                    <TableHead className="w-[120px] min-w-[120px] text-left">{t("actions") || "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3} className="text-center h-32 text-muted-foreground">
                        {t("noUsers") || "No users found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allUsers.map((u) => (
                      <TableRow key={u.id} className="group">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            {u.username}
                            {u.id === currentUserId && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (You)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                              u.role === "ADMIN"
                                ? "bg-destructive/10 text-destructive border border-destructive/20"
                                : "bg-primary/10 text-primary border border-primary/20"
                            }`}
                          >
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {u.id !== currentUserId && u.username !== "admin" && (
                            <Dialog
                              open={deleteTarget === u.id}
                              onOpenChange={(val) => {
                                if (!val) {
                                  setDeleteTarget(null);
                                  setSudoForDelete("");
                                } else {
                                  setDeleteTarget(u.id);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <ActionButton
                                  actionType="delete"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="sr-only">{t("deleteUser") || "Delete"}</span>
                                </ActionButton>
                              </DialogTrigger>
                              <DialogContent className="max-w-md p-6 bg-card/95 backdrop-blur-2xl border border-destructive/20 shadow-2xl sm:rounded-2xl">
                                <div className="flex flex-col items-center text-center space-y-4">
                                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-destructive" />
                                  </div>
                                  <div className="space-y-2">
                                    <DialogTitle className="text-xl font-bold tracking-tight">
                                      {t("deleteUser") || "Delete"} {u.username}?
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground text-sm">
                                      {t("confirmDelete") || "Confirm user deletion. This action cannot be undone."}
                                    </DialogDescription>
                                  </div>

                                  <div className="w-full space-y-4 mt-2">
                                    <input
                                      type="password"
                                      value={sudoForDelete}
                                      onChange={(e) => setSudoForDelete(e.target.value)}
                                      placeholder={t("sudoPassword") || "Your Admin Password"}
                                      className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:border-transparent text-center"
                                    />
                                    {deleteResult.data?.failure && (
                                      <p className="text-xs font-medium text-destructive">
                                        {deleteResult.data.failure}
                                      </p>
                                    )}
                                    <Button
                                      onClick={handleConfirmDelete}
                                      disabled={deleteStatus === "executing" || !sudoForDelete}
                                      variant="destructive"
                                      className="w-full"
                                    >
                                      {deleteStatus === "executing" ? "..." : t("delete") || "Delete"}
                                    </Button>
                                    {deleteResult.data?.success && (
                                      <p className="text-xs font-medium text-green-500 flex items-center justify-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {t("success") || "User successfully deleted"}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </DialogContent>
      </Dialog>

      {/* CREATE USER NESTED DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md w-full p-0 overflow-hidden bg-card/95 backdrop-blur-2xl border border-border/50 shadow-2xl sm:rounded-2xl">
          <DialogHeader className="p-6 pb-2 text-center">
            <div className="mx-auto bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-3 shadow-inner">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {t("createUser") || "Create New User"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              {t("createUserDesc") || "Fill in the details to add a new user to the system."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 pt-2">
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">{t("username") || "Username"}</label>
                <input
                  {...form.register("username")}
                  className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
                  placeholder="e.g. johndoe"
                />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">{t("password") || "Password"}</label>
                <input
                  type="password"
                  {...form.register("password")}
                  className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
                  placeholder="••••••••"
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">{t("role") || "Role"}</label>
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-muted/50 border border-border/50 shadow-inner">
                  <button
                    type="button"
                    onClick={() => form.setValue("role", "USER")}
                    className={`flex items-center justify-center rounded-lg py-2 text-xs font-bold tracking-wide transition-all duration-200 ${
                      selectedRole === "USER"
                        ? "bg-background text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    }`}
                  >
                    USER
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue("role", "ADMIN")}
                    className={`flex items-center justify-center rounded-lg py-2 text-xs font-bold tracking-wide transition-all duration-200 ${
                      selectedRole === "ADMIN"
                        ? "bg-background text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    }`}
                  >
                    ADMIN
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-4 mt-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {t("sudoPassword") || "Your Admin Password"}
                </label>
                <input
                  type="password"
                  {...form.register("sudoPassword")}
                  className="flex h-10 w-full rounded-lg border border-primary/20 bg-background/50 px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent placeholder:text-primary/30"
                  placeholder="Required for security verification"
                />
                {form.formState.errors.sudoPassword && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {form.formState.errors.sudoPassword.message}
                  </p>
                )}
              </div>

              {createResult.data?.failure && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive mt-2 shadow-sm">
                  {createResult.data.failure}
                </div>
              )}
              {createResult.data?.success && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-xs font-medium text-green-600 dark:text-green-400 mt-2 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("success") || "User created successfully"}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto h-10 rounded-lg"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto h-10 rounded-lg px-6 font-semibold shadow-md transition-all active:scale-95"
                  disabled={createStatus === "executing"}
                >
                  {createStatus === "executing" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {createStatus === "executing" ? t("executing") || "Adding..." : t("add") || "Add User"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
