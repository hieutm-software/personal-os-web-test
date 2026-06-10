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
  bulkCreateVaultItemsAction
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
  Clock
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState, useEffect, useRef, useMemo } from "react";
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
import { FormDialog } from "@/components/ui/form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SortIcon } from "@/components/ui/sort-icon";
import { usePendingSync } from "@/lib/hooks/use-pending-sync";
import { useRowSelection } from "@/lib/hooks/use-row-selection";
import { Input } from "@/components/ui/input";

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



  const { execute: execCreate, status: createStatus } = useAction(createVaultItemAction);
  const { execute: execUpdate, status: updateStatus } = useAction(updateVaultItemAction);
  const { execute: execDelete } = useAction(deleteVaultItemAction);
  const { execute: execBulkDelete, status: bulkDeleteStatus } = useAction(bulkDeleteVaultItemsAction);

  const { executeAsync: execExport, status: exportStatus } = useAction(exportVaultItemsAction);
  const { executeAsync: execBulkCreate, status: bulkCreateStatus } = useAction(bulkCreateVaultItemsAction);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localItems, setLocalItems] = useState<VaultItemData[]>(initialItems);
  
  const { masterPassword, setMasterPassword, clearVaultMemory } = useVault();
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState("");

  useEffect(() => {
    if (!masterPassword) {
      setIsUnlockModalOpen(true);
    }
  }, [masterPassword]);

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

  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(5);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedTimeout = localStorage.getItem("personalOSVaultAutoLockTimeout");
    if (savedTimeout !== null) {
      setAutoLockTimeout(parseInt(savedTimeout, 10));
    }
  }, []);

  const lockVault = () => {
    clearVaultMemory();
    setMasterPasswordInput("");
    setDecryptedPasswords({});
  };

  const changeAutoLockTimeout = (minutes: number) => {
    setAutoLockTimeout(minutes);
    localStorage.setItem("personalOSVaultAutoLockTimeout", minutes.toString());
  };

  // Setup auto-lock timer
  useEffect(() => {
    const resetTimer = () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (masterPassword && autoLockTimeout > 0) {
        lockTimerRef.current = setTimeout(() => {
          lockVault();
        }, autoLockTimeout * 60 * 1000);
      }
    };

    resetTimer();

    if (masterPassword && autoLockTimeout > 0) {
      window.addEventListener("mousemove", resetTimer);
      window.addEventListener("keydown", resetTimer);
      window.addEventListener("click", resetTimer);

      return () => {
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
        window.removeEventListener("mousemove", resetTimer);
        window.removeEventListener("keydown", resetTimer);
        window.removeEventListener("click", resetTimer);
      };
    }

    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [masterPassword, autoLockTimeout]);

  // ── DEBOUNCED SYNC QUEUE ──────────────────────────────────────────────────
  const { queueUpdate } = usePendingSync<FormValues & { id?: string }>(execUpdate as unknown as (data: FormValues & { id?: string }) => void);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: "",
      username: "",
      password: "",
      note: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    let passwordToSave = data.password;
    if (passwordToSave && masterPassword) {
      try {
        passwordToSave = await encryptClient(passwordToSave, masterPassword);
      } catch (e: any) {
        form.setError("password", { type: "manual", message: e.message || "Encryption failed" });
        return;
      }
    }
    if (editingItem) {
      setLocalItems(prev => prev.map(i => i.id === editingItem.id ? { 
        ...i, 
        platform: data.platform,
        username: data.username,
        note: data.note || null,
        updatedAt: new Date().toISOString()
      } : i));
      
      if (data.password) {
        setDecryptedPasswords(prev => ({ ...prev, [editingItem.id]: data.password! }));
      }

      queueUpdate(editingItem.id, {
        platform: data.platform,
        username: data.username,
        password: passwordToSave || undefined,
        note: data.note || undefined,
      });
    } else {
      if (!data.password) {
        form.setError("password", { type: "manual", message: "Password is required" });
        return;
      }

      const tempId = generateUUID();
      setLocalItems(prev => [{
        id: tempId,
        platform: data.platform,
        username: data.username,
        note: data.note || null,
        updatedAt: new Date().toISOString(),
        userId: "",
        createdAt: new Date().toISOString(),
        passwordEncrypted: "",
      } as VaultItemData, ...prev]);

      if (data.password) {
        setDecryptedPasswords(prev => ({ ...prev, [tempId]: data.password! }));
      }
      
      execCreate({
        id: tempId,
        platform: data.platform,
        username: data.username,
        password: passwordToSave!,
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
        if (res.data.isE2EE) {
          if (!masterPassword) {
            await alert("Master password is required for E2EE decryption");
            setIsUnlockModalOpen(true);
            return;
          }
          try {
            pwd = await decryptClient(res.data.password, masterPassword);
          } catch (e: any) {
            await alert(e.message || "Failed to decrypt password");
            return;
          }
        } else {
          pwd = res.data.password;
        }
        setDecryptedPasswords(prev => ({ ...prev, [id]: pwd! }));
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
          let pwd = res.data.password;
          if (res.data.isE2EE) {
            if (!masterPassword) {
              await alert("Master password is required for E2EE decryption");
              setIsUnlockModalOpen(true);
              return;
            }
            try {
              pwd = await decryptClient(pwd, masterPassword);
            } catch (e: any) {
              await alert(e.message || "Failed to decrypt password");
              return;
            }
          }
          setDecryptedPasswords(prev => ({ ...prev, [id]: pwd }));
        }
      }
      setShowPasswords(prev => { const n = new Set(prev); n.add(id); return n; });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (await confirm("Are you sure you want to permanently delete this item?", { title: "Delete Item", confirmText: "Delete", variant: "destructive" })) {
      setLocalItems((prev) => prev.filter((i) => i.id !== id));
      execDelete({ id });
      clearSelection();
    }
  };

  const handleBulkDelete = async () => {
    if (await confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected item(s)?`, { title: `Delete ${selectedIds.size} Items`, confirmText: "Delete", variant: "destructive" })) {
      const idsArray = Array.from(selectedIds);
      setLocalItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      execBulkDelete({ ids: idsArray });
      clearSelection();
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
      let exportedData = res.data.data;
      
      // Decrypt any E2EE passwords
      let hasE2EE = false;
      for (const item of exportedData) {
        if (item.password?.startsWith("v2:")) hasE2EE = true;
      }
      
      if (hasE2EE) {
        if (!masterPassword) {
          await alert("Master password is required to export E2EE encrypted items.");
          setIsUnlockModalOpen(true);
          return;
        }
        
        try {
          exportedData = await new Promise((resolve, reject) => {
            const worker = new Worker(new URL('@/lib/workers/crypto.worker.ts', import.meta.url));
            worker.onmessage = (e) => {
              if (e.data.success) {
                resolve(e.data.data);
              } else {
                reject(new Error(e.data.error));
              }
              worker.terminate();
            };
            worker.onerror = (err) => {
              reject(err);
              worker.terminate();
            };
            worker.postMessage({
              type: "BULK_DECRYPT",
              payload: { items: exportedData },
              masterPassword
            });
          });
        } catch (e) {
          console.error("Worker error:", e);
          await alert("Failed to decrypt some items. They will be exported with errors.");
        }
      }

      const dataStr = JSON.stringify(exportedData, null, 2);
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
      
      clearSelection();
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

        let finalItems = validItems;
        if (masterPassword) {
          finalItems = await Promise.all(
            validItems.map(async (item: Record<string, unknown>) => {
              if (typeof item.password === "string" && !item.password.startsWith("v2:")) {
                try {
                  const enc = await encryptClient(item.password, masterPassword);
                  return { ...item, password: enc };
                } catch {
                  return item;
                }
              }
              return item;
            })
          );
        }

        const res = await execBulkCreate({ items: finalItems });
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

  const sortedAndFilteredItems = useMemo(() => {
    const filtered = localItems.filter(i => 
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
  }, [localItems, sortConfig, searchQuery]);

  const { selectedIds, setSelectedIds, handleRowClick, clearSelection } = useRowSelection(sortedAndFilteredItems);

  // ── VIRTUALIZATION ────────────────────────────────────────────────────────
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: sortedAndFilteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, // Approx row height
    overscan: 10,
  });

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
                {[1, 5, 10, 15, 30].map(mins => (
                  <DropdownMenuItem 
                    key={mins} 
                    onClick={() => changeAutoLockTimeout(mins)}
                    className={autoLockTimeout === mins ? "bg-accent" : ""}
                  >
                    {mins} minutes
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem 
                  onClick={() => changeAutoLockTimeout(0)}
                  className={autoLockTimeout === 0 ? "bg-accent" : ""}
                >
                  Never
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={lockVault}
              className="h-8 px-2"
              title="Lock Vault"
            >
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
            <div className="bg-primary/10 p-6 rounded-full mb-6">
              <ShieldCheck className="w-16 h-16 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">Vault is Locked</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
              Your credentials are end-to-end encrypted. You must unlock the vault with your Master Password to access them.
            </p>
            <Button size="lg" onClick={() => setIsUnlockModalOpen(true)} className="gap-2 px-8">
              <Key className="w-4 h-4" />
              Unlock Vault
            </Button>
          </div>
        ) : (
          <>
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
              disabled={exportStatus === "executing" || (selectedIds.size === 0 && localItems.length === 0)}
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
        ref={parentRef}
        onClick={clearSelection}
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
                  <SortIcon active={sortConfig.key === "platform"} direction={sortConfig.direction} />
                </div>
              </TableHead>
              <TableHead 
                className="w-[200px] min-w-[200px] hidden sm:table-cell cursor-pointer group"
                onClick={() => handleSort("username")}
              >
                <div className="flex items-center gap-2">
                  Username
                  <SortIcon active={sortConfig.key === "username"} direction={sortConfig.direction} />
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
                  <SortIcon active={sortConfig.key === "updatedAt"} direction={sortConfig.direction} />
                </div>
              </TableHead>
              <TableHead className="w-[120px] min-w-[120px] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredItems.length === 0 ? (
              <TableRow className="hover:bg-transparent cursor-default">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState 
                    icon={ShieldCheck}
                    title="No Credentials"
                    description={searchQuery ? "No matching credentials found." : "Your vault is empty."}
                  />
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
          </>
        )}

      {/* ── DIALOG ─────────────────────────────────────────────────────── */}
      <FormDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => !open && closeDialog()}
        title={editingItem ? "Edit Credential" : "Add Credential"}
        onSubmit={form.handleSubmit(onSubmit)}
        isSubmitting={createStatus === "executing" || updateStatus === "executing"}
        submitText={editingItem ? "Save Changes" : "Save Credential"}
      >
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">Platform / Website</label>
              <Input
                variant="form"
                {...form.register("platform")}
                placeholder="e.g. Google, GitHub"
                autoFocus
              />
              {form.formState.errors.platform && (
                <p className="text-xs text-destructive px-1">{form.formState.errors.platform.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">Username / Email</label>
              <Input
                variant="form"
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive px-1">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">
                {editingItem ? "New Password (Optional)" : "Password"}
              </label>
              <Input
                variant="form"
                type="password"
                {...form.register("password")}
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
                className="flex w-full rounded-xl border border-black/[0.08] dark:border-premium-border bg-white/90 dark:bg-black/20 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 shadow-sm resize-none transition-all focus:border-indigo-500/50 focus:bg-white dark:focus:bg-premium-dark focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-zinc-400"
              />
            </div>
      </FormDialog>
      
      {/* ── UNLOCK VAULT DIALOG ───────────────────────────────────────── */}
      <Dialog open={isUnlockModalOpen} onOpenChange={(open) => !open && setIsUnlockModalOpen(false)}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md card-aura-responsive border-premium-border p-6 sm:p-8 rounded-2xl shadow-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Unlock Vault
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mt-2 mb-4">
            Enter your Account Password to decrypt your E2EE credentials.
          </div>
          <form onSubmit={handleUnlock} className="space-y-6 flex flex-col">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">Account Password</label>
              <Input
                variant="form"
                type="password"
                value={masterPasswordInput}
                onChange={(e) => {
                  setMasterPasswordInput(e.target.value);
                  setUnlockError("");
                }}
                placeholder="Enter Account Password..."
                autoFocus
                disabled={verifyStatus === "executing"}
              />
              {unlockError && <div className="text-xs text-destructive mt-1 px-1 font-medium">{unlockError}</div>}
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="premium-outline"
                onClick={() => setIsUnlockModalOpen(false)}
                className="ml-auto"
                disabled={verifyStatus === "executing"}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!masterPasswordInput || verifyStatus === "executing"}
              >
                {verifyStatus === "executing" ? "Unlocking..." : "Unlock"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

        </div>
      </PageLayout>
    </div>
  );
}
