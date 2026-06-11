"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialogs } from "@/components/providers/dialog-provider";
import {
  createVaultItemAction,
  deleteVaultItemAction,
  bulkDeleteVaultItemsAction,
  getDecryptedPasswordAction,
  updateVaultItemAction,
  exportVaultItemsAction,
  bulkCreateVaultItemsAction,
} from "@/lib/actions/vault";
import { useVault } from "@/components/providers/vault-provider";
import { verifyCurrentPasswordAction } from "@/lib/actions/users";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Copy,
  Trash2,
  Pencil,
  Loader2,
  Eye,
  EyeOff,
  Download,
  Upload,
  PlusCircle,
  ShieldCheck,
  Key,
  Lock,
  Clock,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState, useRef, useMemo, useCallback, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { z } from "zod";
import { cn, generateUUID, formatDate } from "@/lib/utils";
import { PageLayout } from "@/components/ui/page-layout";
import { Toolbar } from "@/components/ui/toolbar";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/data-table";
import { encryptClient, decryptClient } from "@/lib/crypto-client";
import { BaseModal } from "@/components/ui/base-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { SortIcon } from "@/components/ui/sort-icon";
import { useRowSelection } from "@/lib/hooks/use-row-selection";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

// TYPES

type VaultItemData = {
  id: string;
  platform: string;
  username: string;
  note: string | null;
  updatedAt: string;
};

type OptimisticVaultAction =
  | { type: "add"; item: VaultItemData }
  | { type: "update"; id: string; patch: Partial<VaultItemData> }
  | { type: "delete"; id: string }
  | { type: "bulkDelete"; ids: string[] };

const formSchema = z.object({
  platform: z.string().min(1, "Required"),
  username: z.string().min(1, "Required"),
  password: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type SortKey = "platform" | "username" | "updatedAt";
type SortDirection = "asc" | "desc";

// COMPONENT

export default function VaultClient({ initialItems }: { initialItems: VaultItemData[] }) {
  const { alert, confirm } = useDialogs();
  const { toast } = useToast();
  const router = useRouter();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItemData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: "updatedAt", direction: "desc" });

  // ── useOptimistic ──────────────────────────────────────────────────────────
  const [optimisticItems, dispatchOptimistic] = useOptimistic(
    initialItems,
    (state: VaultItemData[], action: OptimisticVaultAction): VaultItemData[] => {
      switch (action.type) {
        case "add": return [action.item, ...state];
        case "update": return state.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i));
        case "delete": return state.filter((i) => i.id !== action.id);
        case "bulkDelete": return state.filter((i) => !action.ids.includes(i.id));
        default: return state;
      }
    }
  );

  const [, startTransition] = useTransition();

  const mutate = useCallback(
    <TResult extends { failure?: string; success?: unknown }>(
      optimisticAction: OptimisticVaultAction,
      serverAction: () => Promise<TResult | undefined>
    ) => {
      startTransition(async () => {
        dispatchOptimistic(optimisticAction);
        try {
          const result = await serverAction();
          if (result?.failure) toast(result.failure, "error");
          else router.refresh();
        } catch {
          toast("An unexpected error occurred. Changes have been reverted.", "error");
        }
      });
    },
    [dispatchOptimistic, toast, startTransition, router]
  );

  // ── SERVER ACTIONS ────────────────────────────────────────────────────────
  const { executeAsync: execCreate, isExecuting: isCreating } = useAction(createVaultItemAction);
  const { executeAsync: execUpdate, isExecuting: isUpdating } = useAction(updateVaultItemAction);
  const { executeAsync: execDelete } = useAction(deleteVaultItemAction);
  const { executeAsync: execBulkDelete, status: bulkDeleteStatus } = useAction(bulkDeleteVaultItemsAction);
  const { executeAsync: execExport, status: exportStatus } = useAction(exportVaultItemsAction);
  const { executeAsync: execBulkCreate, status: bulkCreateStatus } = useAction(bulkCreateVaultItemsAction);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { masterPassword, setMasterPassword, clearVaultMemory } = useVault();
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(!masterPassword);
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const { executeAsync: executeVerifyPassword, status: verifyStatus } = useAction(verifyCurrentPasswordAction);
  const [unlockError, setUnlockError] = useState("");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError("");
    if (!masterPasswordInput) return;
    const res = await executeVerifyPassword({ password: masterPasswordInput });
    if (res?.data?.success) {
      setMasterPassword(masterPasswordInput);
      setIsUnlockModalOpen(false);
      setMasterPasswordInput("");
    } else {
      setUnlockError(res?.data?.failure || "Incorrect password");
    }
  };

  const [autoLockTimeout, setAutoLockTimeout] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("personalOSVaultAutoLockTimeout");
      return saved !== null ? parseInt(saved, 10) : 5;
    }
    return 5;
  });
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lockVault = useCallback(() => {
    clearVaultMemory();
    setMasterPasswordInput("");
    setDecryptedPasswords({});
  }, [clearVaultMemory]);

  const changeAutoLockTimeout = (minutes: number) => {
    setAutoLockTimeout(minutes);
    localStorage.setItem("personalOSVaultAutoLockTimeout", minutes.toString());
  };

  // Auto-lock timer via ref-based approach (no useEffect needed for simple timer reset)
  const resetTimerRef = useRef<(() => void) | null>(null);
  resetTimerRef.current = () => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (masterPassword && autoLockTimeout > 0) {
      lockTimerRef.current = setTimeout(lockVault, autoLockTimeout * 60 * 1000);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { platform: "", username: "", password: "", note: "" },
  });

  const onSubmit = async (data: FormValues) => {
    let passwordToSave = data.password;
    if (passwordToSave && masterPassword) {
      try {
        passwordToSave = await encryptClient(passwordToSave, masterPassword);
      } catch (e: unknown) {
        form.setError("password", { type: "manual", message: e instanceof Error ? e.message : "Encryption failed" });
        return;
      }
    }

    if (editingItem) {
      if (data.password) setDecryptedPasswords((prev) => ({ ...prev, [editingItem.id]: data.password! }));
      mutate(
        { type: "update", id: editingItem.id, patch: { platform: data.platform, username: data.username, note: data.note || null, updatedAt: new Date().toISOString() } },
        () => execUpdate({ id: editingItem.id, platform: data.platform, username: data.username, password: passwordToSave || undefined, note: data.note || undefined }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    } else {
      if (!data.password) { form.setError("password", { type: "manual", message: "Password is required" }); return; }
      const tempId = generateUUID();
      if (data.password) setDecryptedPasswords((prev) => ({ ...prev, [tempId]: data.password! }));
      mutate(
        { type: "add", item: { id: tempId, platform: data.platform, username: data.username, note: data.note || null, updatedAt: new Date().toISOString() } },
        () => execCreate({ id: tempId, platform: data.platform, username: data.username, password: passwordToSave!, note: data.note || undefined }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    }
    closeDialog();
  };

  const openCreateDialog = () => { setEditingItem(null); form.reset({ platform: "", username: "", password: "", note: "" }); setIsDialogOpen(true); };
  const openEditDialog = (item: VaultItemData) => { setEditingItem(item); form.reset({ platform: item.platform, username: item.username, password: "", note: item.note || "" }); setIsDialogOpen(true); };
  const closeDialog = () => { setIsDialogOpen(false); setTimeout(() => { setEditingItem(null); form.reset(); }, 200); };

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
        if (res.data.isE2EE) {
          if (!masterPassword) { await alert("Master password is required for E2EE decryption"); setIsUnlockModalOpen(true); return; }
          try { pwd = await decryptClient(res.data.password, masterPassword); }
          catch (e: unknown) { await alert(e instanceof Error ? e.message : "Failed to decrypt password"); return; }
        } else { pwd = res.data.password; }
        setDecryptedPasswords((prev) => ({ ...prev, [id]: pwd! }));
      } else { await alert("Failed to decrypt password"); return; }
    }
    await navigator.clipboard.writeText(pwd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const revealPassword = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (showPasswords.has(id)) {
      setShowPasswords((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      if (!decryptedPasswords[id]) {
        const res = await getDecryptedPasswordAction({ id });
        if (res?.data?.success && res.data.password) {
          let pwd = res.data.password;
          if (res.data.isE2EE) {
            if (!masterPassword) { await alert("Master password is required for E2EE decryption"); setIsUnlockModalOpen(true); return; }
            try { pwd = await decryptClient(pwd, masterPassword); }
            catch (e: unknown) { await alert(e instanceof Error ? e.message : "Failed to decrypt password"); return; }
          }
          setDecryptedPasswords((prev) => ({ ...prev, [id]: pwd }));
        }
      }
      setShowPasswords((prev) => { const n = new Set(prev); n.add(id); return n; });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (await confirm("Are you sure you want to permanently delete this item?", { title: "Delete Item", confirmText: "Delete", variant: "destructive" })) {
      clearSelection();
      mutate(
        { type: "delete", id },
        () => execDelete({ id }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    }
  };

  const handleBulkDelete = async () => {
    if (await confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected item(s)?`, { title: `Delete ${selectedIds.size} Items`, confirmText: "Delete", variant: "destructive" })) {
      const ids = Array.from(selectedIds);
      clearSelection();
      mutate(
        { type: "bulkDelete", ids },
        () => execBulkDelete({ ids }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    }
  };

  const handleSort = (key: SortKey) => setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));

  const handleExport = async () => {
    const idsToExport = Array.from(selectedIds);
    const res = await execExport({ ids: idsToExport });
    if (res?.data?.success && res.data.data) {
      let exportedData = res.data.data;
      const hasE2EE = exportedData.some((item) => item.password?.startsWith("v2:"));
      if (hasE2EE) {
        if (!masterPassword) { await alert("Master password is required to export E2EE encrypted items."); setIsUnlockModalOpen(true); return; }
        try {
          exportedData = await new Promise((resolve, reject) => {
            const worker = new Worker(new URL("@/lib/workers/crypto.worker.ts", import.meta.url));
            worker.onmessage = (e) => { if (e.data.success) resolve(e.data.data); else reject(new Error(e.data.error)); worker.terminate(); };
            worker.onerror = (err) => { reject(err); worker.terminate(); };
            worker.postMessage({ type: "BULK_DECRYPT", payload: { items: exportedData }, masterPassword });
          });
        } catch (e) { console.error("Worker error:", e); await alert("Failed to decrypt some items. They will be exported with errors."); }
      }
      const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `vault_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      clearSelection();
    } else { await alert("Failed to export vault items"); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error("Invalid format");
        const validItems = parsed.filter((i) => i.platform && i.username && i.password);
        if (validItems.length === 0) { await alert("No valid credentials found in file"); return; }
        let finalItems = validItems;
        if (masterPassword) {
          finalItems = await Promise.all(validItems.map(async (item: Record<string, unknown>) => {
            if (typeof item.password === "string" && !item.password.startsWith("v2:")) {
              try { return { ...item, password: await encryptClient(item.password, masterPassword) }; }
              catch { return item; }
            }
            return item;
          }));
        }
        const res = await execBulkCreate({ items: finalItems });
        if (!res?.data?.success) await alert("Failed to import items");
      } catch { await alert("Invalid JSON file format"); }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const sortedAndFilteredItems = useMemo(() => {
    const filtered = optimisticItems.filter((i) =>
      searchQuery === "" || i.platform.toLowerCase().includes(searchQuery.toLowerCase()) || i.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === "platform") comparison = a.platform.localeCompare(b.platform);
      else if (sortConfig.key === "username") comparison = a.username.localeCompare(b.username);
      else comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [optimisticItems, sortConfig, searchQuery]);

  const { selectedIds, handleRowClick, clearSelection } = useRowSelection(sortedAndFilteredItems);

  const parentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedAndFilteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53,
    overscan: 10,
  });

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Vault
        </div>
        {masterPassword && (
          <div className="flex items-center gap-1 bg-black/5 dark:bg-black/20 p-1 rounded-lg border border-premium-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 flex items-center gap-1" title="Auto-lock settings">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">{autoLockTimeout > 0 ? `${autoLockTimeout}m` : "Off"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[1, 5, 10, 15, 30].map((mins) => (
                  <DropdownMenuItem key={mins} onClick={() => changeAutoLockTimeout(mins)} className={autoLockTimeout === mins ? "bg-accent" : ""}>{mins} minutes</DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => changeAutoLockTimeout(0)} className={autoLockTimeout === 0 ? "bg-accent" : ""}>Never</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={lockVault} className="h-8 px-2" title="Lock Vault">
              <Lock className="w-4 h-4 text-primary" />
            </Button>
          </div>
        )}
      </div>

      <PageLayout className="relative h-full select-none border-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-emerald-500/5 via-transparent to-transparent pointer-events-none z-0" />
        <div className="relative z-10 h-full flex flex-col">
          {!masterPassword ? (
            <div className="flex flex-col items-center justify-center w-full h-full text-center px-4 animate-in fade-in zoom-in duration-500">
              <div className="bg-primary/10 p-6 rounded-full mb-6"><ShieldCheck className="w-16 h-16 text-primary" /></div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">Vault is Locked</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">Your credentials are end-to-end encrypted. You must unlock the vault with your Master Password to access them.</p>
              <Button size="lg" onClick={() => setIsUnlockModalOpen(true)} className="gap-2 px-8"><Key className="w-4 h-4" />Unlock Vault</Button>
            </div>
          ) : (
            <>
              <Toolbar
                search={<SearchBar value={searchQuery} onValueChange={setSearchQuery} placeholder="Search credentials..." containerClassName="w-full sm:max-w-xs" />}
                actions={
                  <>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={exportStatus === "executing" || (selectedIds.size === 0 && optimisticItems.length === 0)} title={selectedIds.size > 0 ? "Export Selected" : "Export All"}>
                      {exportStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="hidden sm:inline">{selectedIds.size > 0 ? "Export Selected" : "Export All"}</span>
                    </Button>
                    <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={bulkCreateStatus === "executing"} variant="outline" size="sm" title="Import JSON">
                      {bulkCreateStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span className="hidden lg:inline">Import</span>
                    </Button>
                    {selectedIds.size > 0 ? (
                      <Button onClick={handleBulkDelete} disabled={bulkDeleteStatus === "executing"} variant="destructive-outline" size="sm" title="Delete Selected">
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete ({selectedIds.size})</span>
                      </Button>
                    ) : (
                      <Button onClick={openCreateDialog} size="sm">
                        <PlusCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Credential</span>
                      </Button>
                    )}
                  </>
                }
              />

              <TableContainer ref={parentRef} onClick={clearSelection}>
                <Table>
                  <TableHeader onClick={(e) => e.stopPropagation()}>
                    <TableRow>
                      <TableHead className="w-full min-w-[200px] cursor-pointer group" onClick={() => handleSort("platform")}>
                        <div className="flex items-center gap-2">Platform <SortIcon active={sortConfig.key === "platform"} direction={sortConfig.direction} /></div>
                      </TableHead>
                      <TableHead className="w-[200px] min-w-[200px] hidden sm:table-cell cursor-pointer group" onClick={() => handleSort("username")}>
                        <div className="flex items-center gap-2">Username <SortIcon active={sortConfig.key === "username"} direction={sortConfig.direction} /></div>
                      </TableHead>
                      <TableHead className="w-[200px] min-w-[200px] hidden md:table-cell group">
                        <div className="flex items-center gap-2">Password</div>
                      </TableHead>
                      <TableHead className="w-[160px] min-w-[160px] hidden sm:table-cell cursor-pointer select-none group" onClick={() => handleSort("updatedAt")}>
                        <div className="flex items-center gap-1">Modified <SortIcon active={sortConfig.key === "updatedAt"} direction={sortConfig.direction} /></div>
                      </TableHead>
                      <TableHead className="w-[120px] min-w-[120px] text-left">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndFilteredItems.length === 0 ? (
                      <TableRow className="hover:bg-transparent cursor-default">
                        <TableCell colSpan={5} className="p-0">
                          <EmptyState icon={ShieldCheck} title="No Credentials" description={searchQuery ? "No matching credentials found." : "Your vault is empty."} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {rowVirtualizer.getVirtualItems().length > 0 && rowVirtualizer.getVirtualItems()[0].start > 0 && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px`, padding: 0, border: 0 }} />
                          </TableRow>
                        )}
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const item = sortedAndFilteredItems[virtualRow.index];
                          const isSelected = selectedIds.has(item.id);
                          const isPasswordVisible = showPasswords.has(item.id);
                          return (
                            <TableRow
                              key={virtualRow.key}
                              ref={rowVirtualizer.measureElement}
                              data-index={virtualRow.index}
                              onClick={(e) => handleRowClick(e, item.id, virtualRow.index)}
                              onDoubleClick={(e) => { e.stopPropagation(); openEditDialog(item); }}
                              className={cn("group transition-colors border-l-2 cursor-pointer", isSelected ? "bg-primary/5 border-l-primary" : "hover:bg-muted/50 border-l-transparent")}
                            >
                              <TableCell className="font-medium text-foreground truncate">{item.platform}</TableCell>
                              <TableCell className="text-muted-foreground hidden sm:table-cell truncate">
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{item.username}</span>
                                  <button onClick={(e) => copyUsername(e, item.username)} className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100" title="Copy Username">
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground hidden md:table-cell truncate">
                                <div className="flex items-center gap-2">
                                  <span className={cn("truncate", !isPasswordVisible && "tracking-widest font-mono text-xs translate-y-px")}>
                                    {isPasswordVisible ? (decryptedPasswords[item.id] || "Loading...") : "••••••••"}
                                  </span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => revealPassword(e, item.id)} className="text-muted-foreground hover:text-primary transition-colors p-1" title={isPasswordVisible ? "Hide Password" : "Show Password"}>
                                      {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button onClick={(e) => copyPassword(e, item.id)} className={cn("flex items-center transition-colors p-1 rounded-sm", copiedId === item.id ? "text-green-500" : "text-muted-foreground hover:text-primary")} title="Copy Password">
                                      {copiedId === item.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap hidden sm:table-cell">{formatDate(item.updatedAt)}</TableCell>
                              <TableCell className="text-left">
                                <div className="flex items-center justify-start gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <ActionButton actionType="edit" onClick={(e) => { e.stopPropagation(); openEditDialog(item); }} title="Edit">
                                    <Pencil className="w-4 h-4" />
                                  </ActionButton>
                                  <ActionButton actionType="delete" onClick={(e) => handleDelete(e, item.id)} title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                  </ActionButton>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0) > 0 && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} style={{ height: `${rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0)}px`, padding: 0, border: 0 }} />
                          </TableRow>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <BaseModal
                isOpen={isDialogOpen}
                onOpenChange={(open) => !open && closeDialog()}
                title={editingItem ? "Edit Credential" : "Add Credential"}
                onSubmit={form.handleSubmit(onSubmit)}
                isSubmitting={editingItem ? isUpdating : isCreating}
                submitText={editingItem ? "Save" : "Add"}
              >
                <Input variant="form" {...form.register("platform")} placeholder="Platform (e.g. GitHub)" autoFocus />
                {form.formState.errors.platform && <p className="text-xs text-destructive">{form.formState.errors.platform.message}</p>}
                <Input variant="form" {...form.register("username")} placeholder="Username / Email" />
                {form.formState.errors.username && <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>}
                <Input variant="form" type="password" {...form.register("password")} placeholder={editingItem ? "New password (leave blank to keep)" : "Password"} />
                {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
                <Input variant="form" {...form.register("note")} placeholder="Note (optional)" />
              </BaseModal>
            </>
          )}
        </div>
      </PageLayout>

      {/* Unlock Modal */}
      <Dialog open={isUnlockModalOpen} onOpenChange={setIsUnlockModalOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-primary" />Unlock Vault</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              value={masterPasswordInput}
              onChange={(e) => setMasterPasswordInput(e.target.value)}
              placeholder="Enter your master password"
              autoFocus
            />
            {unlockError && <p className="text-sm text-destructive">{unlockError}</p>}
            <Button type="submit" disabled={verifyStatus === "executing"} className="w-full gap-2">
              {verifyStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Unlock
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
