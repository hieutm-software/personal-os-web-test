"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialogs } from "@/components/providers/dialog-provider";
import {
  createVaultItemAction,
  deleteVaultItemAction,
  bulkDeleteVaultItemsAction,
  getDecryptedPasswordAction,
  updateVaultItemAction,
  exportVaultItemsAction,
  bulkCreateVaultItemsAction
} from "@/lib/actions/vault";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Copy,
  Trash2,
  Pencil,
  Loader2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Download,
  Upload,
  PlusCircle,
  ShieldCheck
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useOptimistic, useState, useMemo, useEffect, startTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { z } from "zod";
import { cn, formatDate } from "@/lib/utils";
import { PageLayout } from "@/components/ui/page-layout";
import { Toolbar } from "@/components/ui/toolbar";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/data-table";

type VaultItemData = {
  id: string;
  platform: string;
  username: string;
  note: string | null;
  updatedAt: string;
};

const formSchema = z.object({
  platform: z.string().min(1, "Required"),
  username: z.string().min(1, "Required"),
  password: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type SortKey = "platform" | "username" | "updatedAt";
type SortDirection = "asc" | "desc";

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return null;
  return direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
}

export default function VaultClient({ initialItems }: { initialItems: VaultItemData[] }) {
  const { alert, confirm } = useDialogs();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItemData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState("");

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "updatedAt",
    direction: "desc"
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const { execute: execCreate, status: createStatus } = useAction(createVaultItemAction);
  const { execute: execUpdate, status: updateStatus } = useAction(updateVaultItemAction);
  const { execute: execDelete } = useAction(deleteVaultItemAction);
  const { execute: execBulkDelete, status: bulkDeleteStatus } = useAction(bulkDeleteVaultItemsAction);

  const { executeAsync: execExport, status: exportStatus } = useAction(exportVaultItemsAction);
  const { executeAsync: execBulkCreate, status: bulkCreateStatus } = useAction(bulkCreateVaultItemsAction);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [optimisticItems, addOptimisticItem] = useOptimistic(
    initialItems,
    (state: VaultItemData[], newAction: { type: "ADD" | "UPDATE" | "DELETE" | "BULK_DELETE"; payload?: VaultItemData | { id: string } | { ids: string[] } }) => {
      switch (newAction.type) {
        case "ADD":
          return [newAction.payload as VaultItemData, ...state];
        case "UPDATE":
          return state.map((i) => i.id === (newAction.payload as VaultItemData).id ? { ...i, ...(newAction.payload as VaultItemData) } : i);
        case "DELETE":
          return state.filter((i) => i.id !== (newAction.payload as { id: string }).id);
        case "BULK_DELETE":
          const idsToRemove = new Set((newAction.payload as { ids: string[] }).ids);
          return state.filter((i) => !idsToRemove.has(i.id));
        default:
          return state;
      }
    }
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: "",
      username: "",
      password: "",
      note: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    if (editingItem) {
      startTransition(() => {
        addOptimisticItem({
          type: "UPDATE",
          payload: {
            id: editingItem.id,
            platform: data.platform,
            username: data.username,
            note: data.note || null,
            updatedAt: new Date().toISOString(),
          }
        });
      });
      
      if (data.password) {
        setDecryptedPasswords(prev => ({ ...prev, [editingItem.id]: data.password! }));
      }

      execUpdate({
        id: editingItem.id,
        platform: data.platform,
        username: data.username,
        password: data.password || undefined,
        note: data.note || null,
      });
    } else {
      if (!data.password) {
        form.setError("password", { type: "manual", message: "Password is required" });
        return;
      }

      const tempId = crypto.randomUUID();
      startTransition(() => {
        addOptimisticItem({
          type: "ADD",
          payload: {
            id: tempId,
            platform: data.platform,
            username: data.username,
            note: data.note || null,
            updatedAt: new Date().toISOString(),
          }
        });
      });
      execCreate({
        platform: data.platform,
        username: data.username,
        password: data.password!,
        note: data.note || undefined,
      });
    }
    closeDialog();
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    form.reset({ platform: "", username: "", password: "", note: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = async (item: VaultItemData) => {
    setEditingItem(item);
    form.reset({ platform: item.platform, username: item.username, password: "", note: item.note || "" });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => {
      setEditingItem(null);
      form.reset();
    }, 200);
  };

  const copyUsername = async (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(username);
  };

  const copyPassword = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    let pwd = decryptedPasswords[id];
    if (!pwd) {
      const res = await getDecryptedPasswordAction({ id });
      if (res?.data?.success && res.data.password) {
        pwd = res.data.password;
        setDecryptedPasswords(prev => ({ ...prev, [id]: pwd }));
      } else {
        await alert("Failed to decrypt password");
        return;
      }
    }
    await navigator.clipboard.writeText(pwd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const revealPassword = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (showPasswords.has(id)) {
      setShowPasswords(prev => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      if (!decryptedPasswords[id]) {
        const res = await getDecryptedPasswordAction({ id });
        if (res?.data?.success && res.data.password) {
          const pwd = res.data.password as string;
          setDecryptedPasswords(prev => ({ ...prev, [id]: pwd }));
        }
      }
      setShowPasswords(prev => { const n = new Set(prev); n.add(id); return n; });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (await confirm("Are you sure you want to permanently delete this item?", { title: "Delete Item", confirmText: "Delete", variant: "destructive" })) {
      startTransition(() => {
        addOptimisticItem({ type: "DELETE", payload: { id } });
      });
      execDelete({ id });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (await confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected item(s)?`, { title: `Delete ${selectedIds.size} Items`, confirmText: "Delete", variant: "destructive" })) {
      const idsArray = Array.from(selectedIds);
      startTransition(() => {
        addOptimisticItem({ type: "BULK_DELETE", payload: { ids: idsArray } });
      });
      execBulkDelete({ ids: idsArray });
      setSelectedIds(new Set());
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleExport = async () => {
    const idsToExport = Array.from(selectedIds);
    const res = await execExport({ ids: idsToExport });
    
    if (res?.data?.success && res.data.data) {
      const dataStr = JSON.stringify(res.data.data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `vault_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSelectedIds(new Set());
    } else {
      await alert("Failed to export vault items");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (!Array.isArray(parsed)) throw new Error("Invalid format");
        
        // Very basic validation
        const validItems = parsed.filter(i => i.platform && i.username && i.password);
        
        if (validItems.length === 0) {
          await alert("No valid credentials found in file");
          return;
        }

        const res = await execBulkCreate({ items: validItems });
        if (res?.data?.success) {
          // Since we can't easily optimistic-update everything smoothly due to encryption and lack of IDs,
          // the UI will refresh automatically via Server Action revalidatePath.
        } else {
          await alert("Failed to import items");
        }
      } catch (err) {
        console.error("Import failed", err);
        await alert("Invalid JSON file format");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const filteredAndSortedItems = useMemo(() => {
    const filtered = optimisticItems.filter(i => 
      searchQuery === "" || 
      i.platform.toLowerCase().includes(searchQuery.toLowerCase()) || 
      i.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === "platform") {
        comparison = a.platform.localeCompare(b.platform);
      } else if (sortConfig.key === "username") {
        comparison = a.username.localeCompare(b.username);
      } else if (sortConfig.key === "updatedAt") {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [optimisticItems, sortConfig, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedIds((prev) => {
        const validIds = new Set(filteredAndSortedItems.map((i) => i.id));
        const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
        return next.size === prev.size ? prev : next;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [filteredAndSortedItems]);

  const renderSortIcon = (key: SortKey) => (
    <SortIcon active={sortConfig.key === key} direction={sortConfig.direction} />
  );

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-2 px-2 text-xl font-semibold text-foreground">
        <ShieldCheck className="w-6 h-6 text-primary" />
        Vault
      </div>
      <PageLayout className="rounded-xl border shadow-sm relative h-full select-none">
      <Toolbar
        search={
          <SearchBar
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search credentials..."
            containerClassName="w-full sm:max-w-xs"
          />
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exportStatus === "executing" || (selectedIds.size === 0 && optimisticItems.length === 0)}
              title={selectedIds.size > 0 ? "Export Selected" : "Export All"}
            >
              {exportStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {selectedIds.size > 0 ? "Export Selected" : "Export All"}
              </span>
            </Button>

            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkCreateStatus === "executing"}
              variant="outline"
              size="sm"
              title="Import JSON"
            >
              {bulkCreateStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="hidden lg:inline">Import</span>
            </Button>

            {selectedIds.size > 0 ? (
              <Button
                onClick={handleBulkDelete}
                disabled={bulkDeleteStatus === "executing"}
                variant="destructive-outline"
                size="sm"
                title="Delete Selected"
              >
                {bulkDeleteStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  Delete ({selectedIds.size})
                </span>
              </Button>
            ) : (
              <Button
                onClick={openCreateDialog}
                size="sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Add Credential</span>
              </Button>
            )}
          </>
        }
      />

      <TableContainer
        onClick={() => {
          setSelectedIds(new Set());
          setLastSelectedId(null);
        }}
      >
        <Table>
          <TableHeader onClick={(e) => e.stopPropagation()}>
            <TableRow>
              <TableHead 
                className="w-full min-w-[200px] cursor-pointer group"
                onClick={() => handleSort("platform")}
              >
                <div className="flex items-center gap-2">
                  Platform
                  {renderSortIcon("platform")}
                </div>
              </TableHead>
              <TableHead 
                className="w-[200px] min-w-[200px] hidden sm:table-cell cursor-pointer group"
                onClick={() => handleSort("username")}
              >
                <div className="flex items-center gap-2">
                  Username
                  {renderSortIcon("username")}
                </div>
              </TableHead>
              <TableHead 
                className="w-[200px] min-w-[200px] hidden md:table-cell group"
              >
                <div className="flex items-center gap-2">
                  Password
                </div>
              </TableHead>
              <TableHead 
                className="w-[160px] min-w-[160px] hidden sm:table-cell cursor-pointer select-none group"
                onClick={() => handleSort("updatedAt")}
              >
                <div className="flex items-center gap-1">
                  Modified
                  {renderSortIcon("updatedAt")}
                </div>
              </TableHead>
              <TableHead className="w-[120px] min-w-[120px] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedItems.length === 0 ? (
              <TableRow className="hover:bg-transparent cursor-default">
                <TableCell colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  {searchQuery ? "No matching credentials found." : "Your vault is empty."}
                </TableCell>
              </TableRow>
            ) : (
                filteredAndSortedItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isPasswordVisible = showPasswords.has(item.id);

                  return (
                    <TableRow
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.shiftKey) {
                          e.preventDefault();
                          const currentIndex = filteredAndSortedItems.findIndex(n => n.id === item.id);
                          const anchorId = lastSelectedId || filteredAndSortedItems[0]?.id;
                          const lastIndex = filteredAndSortedItems.findIndex(n => n.id === anchorId);
                          
                          if (currentIndex !== -1 && lastIndex !== -1) {
                            const start = Math.min(currentIndex, lastIndex);
                            const end = Math.max(currentIndex, lastIndex);
                            
                            const next = new Set<string>();
                            for (let i = start; i <= end; i++) {
                              next.add(filteredAndSortedItems[i].id);
                            }
                            setSelectedIds(next);
                          }
                        } else if (e.ctrlKey || e.metaKey) {
                          e.preventDefault();
                          const next = new Set(selectedIds);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          setSelectedIds(next);
                          setLastSelectedId(item.id);
                        } else {
                          setSelectedIds(new Set([item.id]));
                          setLastSelectedId(item.id);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(item);
                      }}
                      className={cn(
                        "group transition-colors border-l-2 cursor-pointer",
                        isSelected
                          ? "bg-primary/5 border-l-primary"
                          : "hover:bg-muted/50 border-l-transparent"
                      )}
                    >
                      <TableCell className="font-medium text-foreground truncate">
                        {item.platform}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell truncate">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{item.username}</span>
                          <button
                            onClick={(e) => copyUsername(e, item.username)}
                            className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                            title="Copy Username"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell truncate">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "truncate",
                            !isPasswordVisible && "tracking-widest font-mono text-xs translate-y-px"
                          )}>
                            {isPasswordVisible ? (decryptedPasswords[item.id] || "Loading...") : "••••••••"}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => revealPassword(e, item.id)}
                              className="text-muted-foreground hover:text-primary transition-colors p-1"
                              title={isPasswordVisible ? "Hide Password" : "Show Password"}
                            >
                              {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={(e) => copyPassword(e, item.id)}
                              className={cn(
                                "flex items-center transition-colors p-1 rounded-sm",
                                copiedId === item.id ? "text-green-500" : "text-muted-foreground hover:text-primary"
                              )}
                              title="Copy Password"
                            >
                              {copiedId === item.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                        {formatDate(item.updatedAt)}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-start gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <ActionButton
                            actionType="edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(item);
                            }}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </ActionButton>
                          <ActionButton
                            actionType="delete"
                            onClick={(e) => handleDelete(e, item.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </ActionButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── DIALOG ─────────────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md bg-background border-border p-6 sm:p-8 rounded-2xl shadow-2xl">
          <DialogHeader className="pr-11">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {editingItem ? "Edit Credential" : "Add Credential"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col mt-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">Platform / Website</label>
              <input
                {...form.register("platform")}
                placeholder="e.g. Google, GitHub"
                className="flex w-full rounded-xl border border-transparent bg-muted/30 px-4 py-3 text-sm font-medium shadow-sm transition-all focus:border-primary/30 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
                autoFocus
              />
              {form.formState.errors.platform && (
                <p className="text-xs text-destructive px-1">{form.formState.errors.platform.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">Username / Email</label>
              <input
                {...form.register("username")}
                className="flex w-full rounded-xl border border-transparent bg-muted/30 px-4 py-3 text-sm font-medium shadow-sm transition-all focus:border-primary/30 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive px-1">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">
                {editingItem ? "New Password (Optional)" : "Password"}
              </label>
              <input
                type="password"
                {...form.register("password")}
                className="flex w-full rounded-xl border border-transparent bg-muted/30 px-4 py-3 text-sm font-medium shadow-sm transition-all focus:border-primary/30 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
                placeholder={editingItem ? "Leave blank to keep current" : ""}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive px-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">Note (Optional)</label>
              <textarea
                {...form.register("note")}
                rows={2}
                className="flex w-full rounded-xl border border-transparent bg-muted/30 px-4 py-3 text-sm shadow-sm resize-none transition-all focus:border-primary/30 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg border border-transparent bg-muted/50 px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors ml-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createStatus === "executing" || updateStatus === "executing"}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {(createStatus === "executing" || updateStatus === "executing") && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Save Credential"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </PageLayout>
    </div>
  );
}
