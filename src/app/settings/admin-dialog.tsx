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
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
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
  username: z.string().min(1, "Required").regex(/^[a-zA-Z0-9_]+$/, "English letters, numbers, underscores only"),
  password: z.string().min(8, "Minimum 8 chars"),
  role: z.enum(["USER", "ADMIN"]),
  sudoPassword: z.string().min(1, "Required"),
});

type CreateForm = z.infer<typeof createSchema>;

export function AdminDialog({
  allUsers,
  currentUserId,
  children,
  open,
  onOpenChange: setOpen,
}: {
  allUsers: UserData[];
  currentUserId: string;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("Admin");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [sudoForDelete, setSudoForDelete] = useState("");

  const {
    execute: execCreate,
    status: createStatus,
    result: createResult,
    reset: resetCreate,
  } = useAction(createUserAction, {
    onSuccess: (actionResult) => {
      if (actionResult.data?.success) {
        form.reset({ username: "", password: "", role: "USER", sudoPassword: "" });
        setTimeout(() => {
          resetCreate();
          setIsCreateOpen(false);
        }, 1500);
      }
    }
  });
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

  const selectedRole = form.watch("role");

  const onSubmitCreate = (data: CreateForm) => {
    execCreate(data);
  };

  // Reset form and action result every time the create dialog opens/closes
  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      form.reset({ username: "", password: "", role: "USER", sudoPassword: "" });
      resetCreate();
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
          {children ? children : (
            <Button>
              <Users className="w-4 h-4" />
              {t("manageUsers")}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent hideClose className="max-w-6xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden card-aura-responsive border-premium-border rounded-2xl shadow-2xl">
          <DialogHeader className="p-4 border-b border-premium-border bg-black/5 dark:bg-black/20 shrink-0 flex flex-row items-center justify-between space-y-0">
            <div className="flex flex-col space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl tracking-tight">
                <ShieldAlert className="w-5 h-5 text-primary" />
                {t("title")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                {t("adminDesc")}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3 pr-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t("createUser")}</span>
              </Button>
              <DialogClose className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground opacity-70 transition-all hover:bg-destructive hover:text-destructive-foreground hover:opacity-100 focus:outline-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-transparent">
            <TableContainer className="h-full overflow-x-hidden">
              <Table>
                <TableHeader className="bg-black/5 dark:bg-black/20">
                  <TableRow className="border-b border-premium-border hover:bg-transparent">
                    <TableHead className="min-w-[200px] text-zinc-500 dark:text-zinc-400 font-medium">{t("username")}</TableHead>
                    <TableHead className="w-[120px] min-w-[120px] text-zinc-500 dark:text-zinc-400 font-medium">{t("role")}</TableHead>
                    <TableHead className="w-[120px] min-w-[120px] text-left text-zinc-500 dark:text-zinc-400 font-medium">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5">
                  {allUsers.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3} className="text-center h-32 text-muted-foreground">
                        {t("noUsers")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allUsers.map((u) => (
                      <TableRow key={u.id} className="group hover:bg-black/5 dark:hover:bg-white/5 border-premium-border transition-colors">
                        <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">
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
                                  <span className="sr-only">{t("deleteUser")}</span>
                                </ActionButton>
                              </DialogTrigger>
                              <DialogContent className="max-w-md p-6 card-aura-responsive border-red-500/20 shadow-2xl rounded-2xl">
                                <div className="flex flex-col items-center text-center space-y-4">
                                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-destructive" />
                                  </div>
                                  <div className="space-y-2">
                                    <DialogTitle className="text-xl font-bold tracking-tight">
                                      {t("deleteUser")} {u.username}?
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground text-sm">
                                      {t("confirmDelete")}
                                    </DialogDescription>
                                  </div>

                                  <div className="w-full space-y-4 mt-2">
                                    <Input
                                      variant="form"
                                      type="password"
                                      value={sudoForDelete}
                                      onChange={(e) => setSudoForDelete(e.target.value)}
                                      placeholder={t("sudoPassword")}
                                      className="text-center focus:ring-red-500/10 focus:border-red-500/50"
                                    />
                                    {deleteResult.data?.failure && (
                                      <p className="text-xs font-medium text-destructive">
                                        {deleteResult.data.failure}
                                      </p>
                                    )}
                                    <Button
                                      variant="destructive"
                                      className="w-full"
                                      onClick={handleConfirmDelete}
                                      disabled={deleteStatus === "executing" || !sudoForDelete}
                                    >
                                      {deleteStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                      {deleteStatus === "executing" ? "..." : t("delete")}
                                    </Button>
                                    {deleteResult.data?.success && (
                                      <p className="text-xs font-medium text-green-500 flex items-center justify-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {t("success")}
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
      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="max-w-md w-full p-0 overflow-hidden card-aura-responsive border-premium-border shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-2 text-center border-b border-premium-border bg-black/5 dark:bg-black/20">
            <div className="mx-auto bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-3 shadow-inner">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {t("createUser")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              {t("createUserDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 pt-2">
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
              <FormField
                error={form.formState.errors.username?.message}
              >
                <Input
                  variant="form"
                  {...form.register("username")}
                  placeholder={`${t("username")} (e.g. johndoe)`}
                />
              </FormField>

              <FormField
                error={form.formState.errors.password?.message}
              >
                <Input
                  variant="form"
                  type="password"
                  {...form.register("password")}
                  placeholder={t("password")}
                />
              </FormField>

              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-black/10 dark:bg-black/40 border border-premium-border shadow-inner">
                  {(["USER", "ADMIN"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => form.setValue("role", role)}
                      className={`flex items-center justify-center rounded-lg py-2 text-xs font-bold tracking-wide transition-all duration-200 ${
                        selectedRole === role
                          ? "bg-premium-dark text-premium-text shadow-sm border border-premium-border"
                          : "text-zinc-500 hover:text-premium-text hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-2">
                <FormField
                  error={form.formState.errors.sudoPassword?.message}
                >
                  <Input
                    variant="form"
                    type="password"
                    {...form.register("sudoPassword")}
                    placeholder={t("sudoPassword")}
                    className="border-indigo-500/20 placeholder:text-indigo-500/30"
                  />
                </FormField>
              </div>

              {createResult.data?.failure && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive mt-2 shadow-sm">
                  {createResult.data.failure}
                </div>
              )}
              {createResult.data?.success && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-xs font-medium text-green-600 dark:text-green-400 mt-2 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("success")}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                  handleCreateOpenChange(false);
                }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={createStatus === "executing"}
                >
                  {createStatus === "executing" && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createStatus === "executing" ? t("executing") : t("add")}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
