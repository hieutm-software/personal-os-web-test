"use client";

import dynamic from "next/dynamic";
const MarkdownEditor = dynamic(() => import("@/components/editor/markdown").then(mod => mod.MarkdownEditor), { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center text-muted-foreground">Loading editor...</div> });

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { SearchBar } from "@/components/ui/search-bar";
import { useDialogs } from "@/components/providers/dialog-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { SortIcon } from "@/components/ui/sort-icon";
import { PageLayout } from "@/components/ui/page-layout";
import { Toolbar } from "@/components/ui/toolbar";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/data-table";
import { useRowSelection } from "@/lib/hooks/use-row-selection";
import { TabSwitcher } from "@/components/ui/tab-switcher";
import {
  bulkDeleteNotesAction,
  bulkPermanentDeleteNotesAction,
  bulkRestoreNotesAction,
  createNoteAction,
  deleteAllNotesAction,
  deleteNoteAction,
  emptyTrashAction,
  permanentDeleteNoteAction,
  restoreAllNotesAction,
  restoreNoteAction,
  updateNoteAction,
} from "@/lib/actions/docs";
import { Note } from "@/lib/db/schema";
import { cn, formatDate, generateUUID } from "@/lib/utils";
import {
  Download,
  FileText,
  Pencil,
  PlusCircle,
  RefreshCcw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useQueryState } from "nuqs";
import { useEffect, useRef, useState, useMemo, startTransition, useCallback } from "react";
import { useOptimisticNotes } from "@/lib/hooks/use-optimistic-notes";

type SortKey = "title" | "createdAt" | "updatedAt";

export function NotesClient({ initialNotes }: { initialNotes: Note[] }) {
  const t = useTranslations("Notes");
  const { confirm } = useDialogs();

  const { optimisticNotes, mutate } = useOptimisticNotes(initialNotes);

  const [activeNoteId, setActiveNoteId] = useQueryState("note", {
    defaultValue: "",
    shallow: true,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "updatedAt", direction: "desc" });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { executeAsync: execCreate } = useAction(createNoteAction);
  const { executeAsync: execUpdate } = useAction(updateNoteAction);
  const { executeAsync: execDelete } = useAction(deleteNoteAction);
  const { executeAsync: execRestore } = useAction(restoreNoteAction);
  const { executeAsync: execPermanentDelete } = useAction(permanentDeleteNoteAction);
  const { executeAsync: execEmptyTrash } = useAction(emptyTrashAction);
  const { executeAsync: execDeleteAll } = useAction(deleteAllNotesAction);
  const { executeAsync: execBulkDelete } = useAction(bulkDeleteNotesAction);
  const { executeAsync: execRestoreAll } = useAction(restoreAllNotesAction);
  const { executeAsync: execBulkRestore } = useAction(bulkRestoreNotesAction);
  const { executeAsync: execBulkPermanentDelete } = useAction(bulkPermanentDeleteNotesAction);

  const activeNote = useMemo(() => optimisticNotes.find((n) => n.id === activeNoteId), [optimisticNotes, activeNoteId]);
  const isDialogOpen = Boolean(activeNoteId && activeNote);
  const isDirty = activeNote
    ? localTitle !== activeNote.title || localContent !== activeNote.content
    : false;

  const sortedAndFilteredNotes = useMemo(() => {
    return optimisticNotes
      .filter((n) => (activeTab === "active" ? !n.deletedAt : n.deletedAt))
      .filter((n) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          (n.title || "Untitled").toLowerCase().includes(q) ||
          (n.content || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let aValue: string | number, bValue: string | number;
        switch (sortConfig.key) {
          case "title":
            aValue = (a.title || "Untitled").toLowerCase();
            bValue = (b.title || "Untitled").toLowerCase();
            break;
          case "createdAt":
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case "updatedAt":
          default:
            aValue = new Date(a.updatedAt).getTime();
            bValue = new Date(b.updatedAt).getTime();
            break;
        }
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [optimisticNotes, activeTab, searchQuery, sortConfig]);

  const {
    selectedIds: selectedNoteIds,
    setSelectedIds: setSelectedNoteIds,
    handleRowClick: handleNoteRowClick,
    clearSelection: clearNoteSelection,
  } = useRowSelection(sortedAndFilteredNotes);

  const validSelectedNoteIds = useMemo(() => {
    const validIds = new Set(sortedAndFilteredNotes.map((n) => n.id));
    const next = new Set<string>();
    for (const id of selectedNoteIds) {
      if (validIds.has(id)) next.add(id);
    }
    return next;
  }, [sortedAndFilteredNotes, selectedNoteIds]);

  useEffect(() => {
    if (validSelectedNoteIds.size !== selectedNoteIds.size) {
      setSelectedNoteIds(validSelectedNoteIds);
    }
  }, [validSelectedNoteIds, selectedNoteIds.size, setSelectedNoteIds]);

  const draftKey = activeNoteId ? `personal-os-note-draft-${activeNoteId}` : null;

  useEffect(() => {
    if (activeNote) {
      const savedDraft = draftKey ? localStorage.getItem(draftKey) : null;
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setLocalTitle(parsed.title);
          setLocalContent(parsed.content);
        } catch {
          setLocalTitle(activeNote.title);
          setLocalContent(activeNote.content);
        }
      } else {
        setLocalTitle(activeNote.title);
        setLocalContent(activeNote.content);
      }
    }
  }, [activeNote, draftKey]);

  useEffect(() => {
    if (activeNoteId && isDirty) {
      const timer = setTimeout(() => {
        if (draftKey) {
          localStorage.setItem(draftKey, JSON.stringify({ title: localTitle, content: localContent }));
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [localTitle, localContent, activeNoteId, isDirty, draftKey]);

  useEffect(() => {
    const t = setTimeout(() => { import("@/components/editor/markdown"); }, 1000);
    return () => clearTimeout(t);
  }, []);

  const getUniqueTitle = useCallback((baseTitle: string, excludeId?: string) => {
    const title = baseTitle || t("untitled");
    let finalTitle = title;
    let counter = 1;
    const existing = new Set(
      optimisticNotes
        .filter((n) => n.id !== excludeId && !n.deletedAt)
        .map((n) => n.title.trim().toLowerCase())
    );
    while (existing.has(finalTitle.trim().toLowerCase())) {
      finalTitle = `${title} (${counter})`;
      counter++;
    }
    return finalTitle;
  }, [optimisticNotes, t]);

  const handleLocalSave = useCallback(() => {
    if (!activeNote || !isDirty) return;
    const uniqueTitle = getUniqueTitle(localTitle, activeNote.id);
    if (uniqueTitle !== localTitle) setLocalTitle(uniqueTitle);
    mutate(
      { type: "update", id: activeNote.id, patch: { title: uniqueTitle, content: localContent, updatedAt: new Date().toISOString() } },
      async () => ({ success: true }),
      { skipRefresh: true }
    );
  }, [activeNote, isDirty, localTitle, getUniqueTitle, localContent, mutate]);

  const syncToDatabase = useCallback(() => {
    if (!activeNote) return;
    const uniqueTitle = getUniqueTitle(localTitle, activeNote.id);
    if (activeNote.title !== uniqueTitle || activeNote.content !== localContent) {
      mutate(
        { type: "update", id: activeNote.id, patch: { title: uniqueTitle, content: localContent, updatedAt: new Date().toISOString() } },
        () => execUpdate({ id: activeNote.id, title: uniqueTitle, content: localContent }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    }
    if (draftKey) localStorage.removeItem(draftKey);
  }, [activeNote, localTitle, getUniqueTitle, localContent, mutate, execUpdate, draftKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        if (isDialogOpen && isDirty && activeNote) {
          e.preventDefault();
          handleLocalSave();
        }
      }
    };
    const handleBeforeUnload = () => {
      if (isDirty) syncToDatabase();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDialogOpen, isDirty, activeNote, localTitle, localContent, handleLocalSave, syncToDatabase]);

  const handleCloseDialog = () => {
    if (isDirty && activeNote) {
      syncToDatabase();
    }
    startTransition(() => { void setActiveNoteId(""); });
  };

  const handleCreate = async () => {
    const newId = generateUUID();
    const newTitle = getUniqueTitle(t("untitled"));
    setActiveTab("active");
    mutate(
      {
        type: "add",
        note: {
          id: newId,
          title: newTitle,
          content: "",
          userId: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        } as Note,
      },
      () => execCreate({ id: newId, title: newTitle, content: "" }) as Promise<{ failure?: string; success?: unknown } | undefined>
    );
  };

  const handleEditClick = (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditorTab("write");
    startTransition(() => { void setActiveNoteId(note.id); });
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeNoteId === id) startTransition(() => { void setActiveNoteId(""); });
    mutate(
      { type: "softDelete", id },
      () => execDelete({ id }) as Promise<{ failure?: string; success?: unknown } | undefined>
    );
  };

  const handleRestore = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const note = optimisticNotes.find((n) => n.id === id);
    if (!note) return;
    if (await confirm(`Are you sure you want to restore "${note.title || "Untitled"}"?`, { title: "Restore Item", confirmText: "Restore", variant: "default" })) {
      mutate(
        { type: "restore", id },
        () => execRestore({ id }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    }
  };

  const handlePermanentDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (await confirm("Are you sure you want to permanently delete this item?", { title: "Delete Item", confirmText: "Delete", variant: "destructive" })) {
      mutate(
        { type: "hardDelete", id },
        () => execPermanentDelete({ id }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    }
  };

  const handleEmptyTrash = async () => {
    if (selectedNoteIds.size > 0) {
      if (await confirm(`Are you sure you want to permanently delete ${selectedNoteIds.size} selected item(s)?`, { title: `Delete ${selectedNoteIds.size} Items`, confirmText: "Delete", variant: "destructive" })) {
        const ids = Array.from(selectedNoteIds);
        setSelectedNoteIds(new Set());
        mutate(
          { type: "bulkHardDelete", ids },
          () => execBulkPermanentDelete({ ids }) as Promise<{ failure?: string; success?: unknown } | undefined>
        );
      }
    } else {
      if (await confirm("Are you sure you want to permanently delete all items in the Trash?", { title: "Empty Trash", confirmText: "Empty Trash", variant: "destructive" })) {
        mutate(
          { type: "emptyTrash" },
          () => execEmptyTrash() as Promise<{ failure?: string; success?: unknown } | undefined>
        );
      }
    }
  };

  const handleRestoreAll = async () => {
    if (selectedNoteIds.size > 0) {
      if (await confirm(`Are you sure you want to restore ${selectedNoteIds.size} selected item(s)?`, { title: `Restore ${selectedNoteIds.size} Items`, confirmText: "Restore", variant: "default" })) {
        const ids = Array.from(selectedNoteIds);
        setSelectedNoteIds(new Set());
        mutate(
          { type: "bulkRestore", ids },
          () => execBulkRestore({ ids }) as Promise<{ failure?: string; success?: unknown } | undefined>
        );
      }
    } else {
      if (await confirm("Are you sure you want to restore all items from the Trash?", { title: "Restore All", confirmText: "Restore", variant: "default" })) {
        mutate(
          { type: "restoreAll" },
          () => execRestoreAll() as Promise<{ failure?: string; success?: unknown } | undefined>
        );
      }
    }
  };

  const handleDeleteAll = async () => {
    if (selectedNoteIds.size > 0) {
      const ids = Array.from(selectedNoteIds);
      setSelectedNoteIds(new Set());
      mutate(
        { type: "bulkSoftDelete", ids },
        () => execBulkDelete({ ids }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    } else {
      mutate(
        { type: "softDeleteAll" },
        () => execDeleteAll() as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    }
  };

  const downloadNote = (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const blob = new Blob([note.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title || "Untitled"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadNote = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const newId = generateUUID();
      const newTitle = file.name.replace(/\.[^/.]+$/, "");
      const newContent = event.target?.result as string;
      setActiveTab("active");
      mutate(
        {
          type: "add",
          note: {
            id: newId,
            title: newTitle,
            content: newContent,
            userId: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          } as Note,
        },
        () => execCreate({ id: newId, title: newTitle, content: newContent }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async () => {
    let filesToDownload = sortedAndFilteredNotes;
    if (selectedNoteIds.size > 0) {
      filesToDownload = sortedAndFilteredNotes.filter((n) => selectedNoteIds.has(n.id));
    }
    if (filesToDownload.length === 0) return;
    try {
      if (filesToDownload.length === 1) {
        const note = filesToDownload[0];
        const title = note.title ? `${note.title}.md` : `Untitled_${note.id.substring(0, 4)}.md`;
        const blob = new Blob([note.content || ""], { type: "text/markdown" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = title;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); window.URL.revokeObjectURL(url);
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        filesToDownload.forEach((note) => {
          const title = note.title ? `${note.title}.md` : `Untitled_${note.id.substring(0, 4)}.md`;
          zip.file(title, note.content || "");
        });
        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url; a.download = `notes_${formatDate(new Date()).replace(/[:\/ ]/g, "_")}.zip`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); window.URL.revokeObjectURL(url);
      }
      setSelectedNoteIds(new Set());
    } catch (error) {
      console.error("Failed to download files:", error);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <FileText className="w-6 h-6 text-primary" />
          Notes
        </div>
        <TabSwitcher
          tabs={[
            { value: "active", label: t("notes") || "Notes" },
            { value: "trash", label: t("trash") || "Trash" },
          ]}
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as "active" | "trash");
            clearNoteSelection();
          }}
        />
      </div>
      <PageLayout className="relative h-full border-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-blue-500/5 via-transparent to-transparent pointer-events-none z-0" />
        <div className="relative z-10 h-full flex flex-col">
          <Toolbar
            search={
              <SearchBar
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder="Search notes..."
                containerClassName="w-full sm:max-w-xs"
              />
            }
            actions={
              <>
                <input type="file" accept=".md,.txt" ref={fileInputRef} onChange={uploadNote} className="hidden" />

                {activeTab === "active" && (
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} title="Upload Note">
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Import</span>
                  </Button>
                )}

                {activeTab === "active" ? (
                  <div key="active-buttons" className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={sortedAndFilteredNotes.length === 0}
                      title={selectedNoteIds.size > 0 ? `Export (${selectedNoteIds.size})` : "Export All"}>
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {selectedNoteIds.size > 0 ? `Export (${selectedNoteIds.size})` : "Export All"}
                      </span>
                    </Button>
                    <Button variant="destructive-outline" size="sm" onClick={handleDeleteAll}
                      disabled={sortedAndFilteredNotes.length === 0}
                      title={selectedNoteIds.size > 0 ? `Delete (${selectedNoteIds.size})` : "Delete All"}>
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {selectedNoteIds.size > 0 ? `Delete (${selectedNoteIds.size})` : "Delete All"}
                      </span>
                    </Button>
                    <Button size="sm" onClick={handleCreate}>
                      <PlusCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">{t("newNote")}</span>
                    </Button>
                  </div>
                ) : (
                  <div key="trash-buttons" className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRestoreAll}
                      disabled={sortedAndFilteredNotes.length === 0}
                      title={selectedNoteIds.size > 0 ? `Restore (${selectedNoteIds.size})` : "Restore All"}
                      className="hover:text-emerald-500 hover:bg-emerald-500/10">
                      <RefreshCcw className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {selectedNoteIds.size > 0 ? `Restore (${selectedNoteIds.size})` : "Restore All"}
                      </span>
                    </Button>
                    <Button variant="destructive-outline" size="sm" onClick={handleEmptyTrash}
                      disabled={sortedAndFilteredNotes.length === 0}
                      title={selectedNoteIds.size > 0 ? `Delete (${selectedNoteIds.size})` : "Empty Trash"}>
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {selectedNoteIds.size > 0 ? `Delete (${selectedNoteIds.size})` : "Empty Trash"}
                      </span>
                    </Button>
                  </div>
                )}
              </>
            }
          />

          <TableContainer onClick={() => clearNoteSelection()}>
            <Table>
              <TableHeader onClick={(e) => e.stopPropagation()}>
                <TableRow>
                  <TableHead className="w-full min-w-[200px] cursor-pointer group" onClick={() => handleSort("title")}>
                    <div className="flex items-center gap-2">Name <SortIcon active={sortConfig.key === "title"} direction={sortConfig.direction} /></div>
                  </TableHead>
                  <TableHead className="w-[160px] min-w-[160px] hidden sm:table-cell cursor-pointer select-none group" onClick={() => handleSort("updatedAt")}>
                    <div className="flex items-center gap-1">Modified <SortIcon active={sortConfig.key === "updatedAt"} direction={sortConfig.direction} /></div>
                  </TableHead>
                  <TableHead className="w-[160px] min-w-[160px] text-left">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredNotes.length === 0 ? (
                  <TableRow className="hover:bg-transparent cursor-default">
                    <TableCell colSpan={4} className="p-0">
                      <EmptyState
                        icon={FileText}
                        title={t("noNotes")}
                        description={searchQuery ? "No matching notes found." : activeTab === "trash" ? "Trash is empty." : "You have no notes yet."}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAndFilteredNotes.map((note) => (
                    <TableRow
                      key={note.id}
                      onClick={(e) => handleNoteRowClick(e, note.id, sortedAndFilteredNotes.findIndex((n) => n.id === note.id))}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (activeTab === "active") {
                          setEditorTab("preview");
                          startTransition(() => { void setActiveNoteId(note.id); });
                        }
                      }}
                      className={cn(
                        "group transition-colors border-l-2 cursor-pointer",
                        selectedNoteIds.has(note.id)
                          ? "bg-primary/5 border-l-primary"
                          : "hover:bg-muted/50 border-l-transparent"
                      )}
                    >
                      <TableCell className="font-medium text-foreground w-full max-w-[0px]">
                        <div className="flex items-center gap-3 w-full">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="truncate w-full">{note.title || "Untitled"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground hidden sm:table-cell">
                        {formatDate(note.updatedAt)}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-start gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onDoubleClick={(e) => e.stopPropagation()}>
                          {activeTab === "active" ? (
                            <>
                              <ActionButton actionType="download" onClick={(e) => downloadNote(note, e)} title="Download">
                                <Download className="w-4 h-4" />
                              </ActionButton>
                              <ActionButton actionType="edit" onClick={(e) => handleEditClick(note, e)} title="Edit">
                                <Pencil className="w-4 h-4" />
                              </ActionButton>
                              <ActionButton actionType="delete" onClick={(e) => handleDelete(note.id, e)} title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </ActionButton>
                            </>
                          ) : (
                            <>
                              <ActionButton actionType="restore" onClick={(e) => handleRestore(note.id, e)} title="Restore">
                                <RefreshCcw className="w-4 h-4" />
                              </ActionButton>
                              <ActionButton actionType="delete" onClick={(e) => handlePermanentDelete(note.id, e)} title="Permanently Delete">
                                <Trash2 className="w-4 h-4" />
                              </ActionButton>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* EDITOR DIALOG — raw Dialog for full layout control */}
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => !open && handleCloseDialog()}
          >
            <DialogContent
              aria-describedby={undefined}
              hideClose
              className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl card-aura-responsive border-premium-border"
            >
              {/* sr-only title for accessibility */}
              <DialogTitle className="sr-only">Edit Note</DialogTitle>

              {/* Custom header: inline title input + save button */}
              <div className="p-4 border-b border-premium-border bg-black/5 dark:bg-black/20 flex flex-row items-center justify-between shrink-0">
                <div className="flex-1 pr-4">
                  <input
                    type="text"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    className="bg-transparent text-xl font-bold tracking-tight focus:outline-none w-full placeholder:text-muted-foreground"
                    placeholder={t("untitled")}
                  />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isDirty && <span className="text-xs text-muted-foreground mr-2">Unsaved changes (Ctrl+S)</span>}
                  <Button
                    onClick={handleLocalSave}
                    disabled={!isDirty}
                    variant={isDirty ? "default" : "outline"}
                    className="gap-2 shrink-0"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Editor area fills remaining height */}
              <div className="flex-1 overflow-hidden relative p-4 bg-transparent min-h-0">
                <MarkdownEditor
                  value={localContent}
                  onChange={(val) => setLocalContent(val)}
                  activeTab={editorTab}
                  onTabChange={setEditorTab}
                  className="h-full"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageLayout>
    </div>
  );
}

