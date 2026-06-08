"use client";

import { MarkdownEditor } from "@/components/editor/markdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { SearchBar } from "@/components/ui/search-bar";
import { useDialogs } from "@/components/providers/dialog-provider";
import { PageLayout } from "@/components/ui/page-layout";

import { Toolbar } from "@/components/ui/toolbar";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/data-table";
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
import { cn, formatDate } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
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
import { useEffect, useRef, useState, useMemo } from "react";

export function NotesClient({ initialNotes }: { initialNotes: Note[] }) {
  const t = useTranslations("Notes");
  const { confirm } = useDialogs();

  // URL State — syncs active note ID to the URL (for the dialog)
  const [activeNoteId, setActiveNoteId] = useQueryState("id", {
    defaultValue: "",
  });
  
  // Local State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [lastSelectedNoteId, setLastSelectedNoteId] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<{
    key: "title" | "createdAt" | "updatedAt";
    direction: "asc" | "desc";
  }>({ key: "updatedAt", direction: "desc" });

  const handleSort = (key: "title" | "createdAt" | "updatedAt") => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isImportingRef = useRef(false);

  // Actions
  const { execute: execCreate, status: createStatus, result: createResult } = useAction(createNoteAction);
  const { execute: execUpdate, status: updateStatus } = useAction(updateNoteAction);
  const { execute: execDelete } = useAction(deleteNoteAction);
  const { execute: execRestore } = useAction(restoreNoteAction);
  const { execute: execPermanentDelete } = useAction(permanentDeleteNoteAction);
  const { execute: execEmptyTrash, status: emptyTrashStatus } = useAction(emptyTrashAction);
  const { execute: execDeleteAll, status: deleteAllStatus } = useAction(deleteAllNotesAction);
  const { execute: execBulkDelete, status: bulkDeleteStatus } = useAction(bulkDeleteNotesAction);
  const { execute: execRestoreAll, status: restoreAllStatus } = useAction(restoreAllNotesAction);
  const { execute: execBulkRestore, status: bulkRestoreStatus } = useAction(bulkRestoreNotesAction);
  const { execute: execBulkPermanentDelete, status: bulkPermanentDeleteStatus } = useAction(bulkPermanentDeleteNotesAction);

  // Computed values
  const activeNote = initialNotes.find((n) => n.id === activeNoteId);
  const isDialogOpen = Boolean(activeNoteId && activeNote);
  const isDirty = activeNote ? localTitle !== activeNote.title || localContent !== activeNote.content : false;

  const filteredNotes = useMemo(() => {
    return initialNotes
      .filter((n) => (activeTab === "active" ? !n.deletedAt : n.deletedAt))
      .filter((n) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const titleMatch = (n.title || "Untitled").toLowerCase().includes(q);
        const contentMatch = (n.content || "").toLowerCase().includes(q);
        return titleMatch || contentMatch;
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
  }, [initialNotes, activeTab, searchQuery, sortConfig]);

  const renderSortIcon = (columnKey: "title" | "createdAt" | "updatedAt") => {
    if (sortConfig.key !== columnKey) return null;
    return (
      <span className="text-muted-foreground">
        {sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </span>
    );
  };

  // Clean up selected IDs if notes are deleted or filtered out
  useEffect(() => {
    setTimeout(() => {
      setSelectedNoteIds((prev) => {
        const validIds = new Set(filteredNotes.map((n) => n.id));
        const next = new Set<string>();
        let changed = false;
        for (const id of prev) {
          if (validIds.has(id)) {
            next.add(id);
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      setLastSelectedNoteId((prev) => {
        if (prev && !filteredNotes.some((n) => n.id === prev)) {
          return null;
        }
        return prev;
      });
    }, 0);
  }, [filteredNotes]);

  // Sync active note to local state when opening dialog
  useEffect(() => {
    if (activeNote) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalTitle(activeNote.title);
      setLocalContent(activeNote.content);
    }
  }, [activeNote]);

  // Auto-routing upon new note creation
  useEffect(() => {
    if (createResult.data?.success && createResult.data.noteId) {
      if (!isImportingRef.current) {
        void setActiveNoteId(createResult.data.noteId);
      } else {
        isImportingRef.current = false;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab("active");
    }
  }, [createResult.data, setActiveNoteId]);

  // Handlers
  const handleSave = () => {
    if (!activeNote || !isDirty) return;
    execUpdate({
      id: activeNote.id,
      title: localTitle || t("untitled"),
      content: localContent,
    });
  };

  // Handle Ctrl+S for manual save and BeforeUnload for unsaved changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        if (isDialogOpen && isDirty && activeNote) {
          e.preventDefault();
          handleSave();
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, isDirty, activeNote, localTitle, localContent]);

  const handleCloseDialog = () => {
    // Unmount save
    if (isDirty && activeNote) {
      handleSave();
    }
    void setActiveNoteId("");
  };

  const handleCreate = () => {
    setEditorTab("write");
    execCreate({ title: t("untitled"), content: "" });
  };

  const handleEditClick = (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditorTab("write");
    void setActiveNoteId(note.id);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeNoteId === id) void setActiveNoteId("");
    execDelete({ id });
  };

  const handleRestore = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const note = initialNotes.find((n) => n.id === id) || filteredNotes.find((n) => n.id === id);
    if (!note) return;
    if (await confirm(`Are you sure you want to restore "${note.title || "Untitled"}"?`, { title: "Restore Item", confirmText: "Restore", variant: "default" })) {
      execRestore({ id });
    }
  };

  const handlePermanentDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (await confirm(`Are you sure you want to permanently delete this item?`, { title: "Delete Item", confirmText: "Delete", variant: "destructive" })) {
      execPermanentDelete({ id });
    }
  };

  const handleEmptyTrash = async () => {
    if (selectedNoteIds.size > 0) {
      if (await confirm(`Are you sure you want to permanently delete ${selectedNoteIds.size} selected item(s)?`, { title: `Delete ${selectedNoteIds.size} Items`, confirmText: "Delete", variant: "destructive" })) {
        execBulkPermanentDelete({ ids: Array.from(selectedNoteIds) });
        setSelectedNoteIds(new Set());
      }
    } else {
      if (await confirm("Are you sure you want to permanently delete all items in the Trash?", { title: "Empty Trash", confirmText: "Empty Trash", variant: "destructive" })) {
        execEmptyTrash();
      }
    }
  };

  const handleRestoreAll = async () => {
    if (selectedNoteIds.size > 0) {
      if (await confirm(`Are you sure you want to restore ${selectedNoteIds.size} selected item(s)?`, { title: `Restore ${selectedNoteIds.size} Items`, confirmText: "Restore", variant: "default" })) {
        execBulkRestore({ ids: Array.from(selectedNoteIds) });
        setSelectedNoteIds(new Set());
      }
    } else {
      if (await confirm("Are you sure you want to restore all items from the Trash?", { title: "Restore All", confirmText: "Restore", variant: "default" })) {
        execRestoreAll();
      }
    }
  };

  const handleDeleteAll = async () => {
    if (selectedNoteIds.size > 0) {
      execBulkDelete({ ids: Array.from(selectedNoteIds) });
      setSelectedNoteIds(new Set());
    } else {
      execDeleteAll();
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
      isImportingRef.current = true;
      execCreate({ 
        title: file.name.replace(/\.[^/.]+$/, ""), 
        content: event.target?.result as string 
      });
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async () => {
    let filesToDownload = filteredNotes;
    
    if (selectedNoteIds.size > 0) {
      filesToDownload = filteredNotes.filter(n => selectedNoteIds.has(n.id));
    }

    if (filesToDownload.length === 0) return;

    try {
      if (filesToDownload.length === 1) {
        const note = filesToDownload[0];
        const title = note.title ? `${note.title}.md` : `Untitled_${note.id.substring(0, 4)}.md`;
        const blob = new Blob([note.content || ""], { type: "text/markdown" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = title;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        filesToDownload.forEach(note => {
          const title = note.title ? `${note.title}.md` : `Untitled_${note.id.substring(0, 4)}.md`;
          zip.file(title, note.content || "");
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `notes_${formatDate(new Date()).replace(/[:\/ ]/g, "_")}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
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
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
          <Button
            variant={activeTab === "active" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab("active");
              setSelectedNoteIds(new Set());
              setLastSelectedNoteId(null);
            }}
            className={activeTab === "active" ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground"}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Notes</span>
          </Button>
          <Button
            variant={activeTab === "trash" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab("trash");
              setSelectedNoteIds(new Set());
              setLastSelectedNoteId(null);
            }}
            className={activeTab === "trash" ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground"}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Trash</span>
          </Button>
        </div>
      </div>
      <PageLayout className="rounded-xl border shadow-sm relative h-full">
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

          <input
            type="file"
            accept=".md,.txt"
            ref={fileInputRef}
            onChange={uploadNote}
            className="hidden"
          />

          {activeTab === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              title="Upload Note"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          )}

          {activeTab === "active" ? (
            <div key="active-buttons" className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={filteredNotes.length === 0}
                title={selectedNoteIds.size > 0 ? `Export (${selectedNoteIds.size})` : "Export All"}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {selectedNoteIds.size > 0 ? `Export (${selectedNoteIds.size})` : "Export All"}
                </span>
              </Button>
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={handleDeleteAll}
                disabled={(deleteAllStatus === "executing" && selectedNoteIds.size === 0) || bulkDeleteStatus === "executing" || filteredNotes.length === 0}
                title={selectedNoteIds.size > 0 ? `Delete (${selectedNoteIds.size})` : "Delete All"}
              >
                {deleteAllStatus === "executing" || bulkDeleteStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {selectedNoteIds.size > 0 ? `Delete (${selectedNoteIds.size})` : "Delete All"}
                </span>
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={createStatus === "executing"}
              >
                {createStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                <span className="hidden sm:inline">{t("newNote")}</span>
              </Button>
            </div>
          ) : (
            <div key="trash-buttons" className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreAll}
                disabled={(restoreAllStatus === "executing" && selectedNoteIds.size === 0) || bulkRestoreStatus === "executing" || filteredNotes.length === 0}
                title={selectedNoteIds.size > 0 ? `Restore (${selectedNoteIds.size})` : "Restore All"}
                className="hover:text-emerald-500 hover:bg-emerald-500/10"
              >
                {restoreAllStatus === "executing" || bulkRestoreStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {selectedNoteIds.size > 0 ? `Restore (${selectedNoteIds.size})` : "Restore All"}
                </span>
              </Button>
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={handleEmptyTrash}
                disabled={(emptyTrashStatus === "executing" && selectedNoteIds.size === 0) || bulkPermanentDeleteStatus === "executing" || filteredNotes.length === 0}
                title={selectedNoteIds.size > 0 ? `Delete (${selectedNoteIds.size})` : "Empty Trash"}
              >
                {emptyTrashStatus === "executing" || bulkPermanentDeleteStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {selectedNoteIds.size > 0 ? `Delete (${selectedNoteIds.size})` : "Empty Trash"}
                </span>
              </Button>
            </div>
          )}
          </>
        }
      />

      {/* ── FILE EXPLORER (TABLE VIEW) ──────────────────────────────────── */}
      <TableContainer
        onClick={() => {
          setSelectedNoteIds(new Set());
          setLastSelectedNoteId(null);
        }}
      >
        <Table>
          <TableHeader onClick={(e) => e.stopPropagation()}>
            <TableRow>
              <TableHead 
                className="w-full min-w-[200px] cursor-pointer group"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center gap-2">
                  Name
                  {renderSortIcon("title")}
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

              <TableHead className="w-[160px] min-w-[160px] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNotes.length === 0 ? (
              <TableRow className="hover:bg-transparent cursor-default">
                <TableCell colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  {searchQuery ? "No matching notes found." : activeTab === "trash" ? "Trash is empty." : t("noNotes")}
                </TableCell>
              </TableRow>
            ) : (
              filteredNotes.map((note) => (
                <TableRow
                  key={note.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      e.preventDefault();
                      const currentIndex = filteredNotes.findIndex(n => n.id === note.id);
                      const anchorId = lastSelectedNoteId || filteredNotes[0]?.id;
                      const lastIndex = filteredNotes.findIndex(n => n.id === anchorId);
                      
                      if (currentIndex !== -1 && lastIndex !== -1) {
                        const start = Math.min(currentIndex, lastIndex);
                        const end = Math.max(currentIndex, lastIndex);
                        
                        const next = new Set<string>();
                        for (let i = start; i <= end; i++) {
                          next.add(filteredNotes[i].id);
                        }
                        setSelectedNoteIds(next);
                      }
                    } else if (e.ctrlKey || e.metaKey) {
                      e.preventDefault();
                      const next = new Set(selectedNoteIds);
                      if (next.has(note.id)) next.delete(note.id);
                      else next.add(note.id);
                      setSelectedNoteIds(next);
                      setLastSelectedNoteId(note.id);
                    } else {
                      setSelectedNoteIds(new Set([note.id]));
                      setLastSelectedNoteId(note.id);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (activeTab === "active") {
                      setEditorTab("preview");
                      void setActiveNoteId(note.id);
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
                      <div className="truncate w-full">
                        {note.title || "Untitled"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground hidden sm:table-cell">
                    {formatDate(note.updatedAt)}
                  </TableCell>

                  <TableCell className="text-left">
                    <div 
                      className="flex items-center justify-start gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      onDoubleClick={(e) => e.stopPropagation()}
                    >
                      {activeTab === "active" ? (
                        <>
                          <ActionButton
                            actionType="download"
                            onClick={(e) => downloadNote(note, e)}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </ActionButton>
                          <ActionButton
                            actionType="edit"
                            onClick={(e) => handleEditClick(note, e)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </ActionButton>
                          <ActionButton
                            actionType="delete"
                            onClick={(e) => handleDelete(note.id, e)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </ActionButton>
                        </>
                      ) : (
                        <>
                          <ActionButton
                            actionType="restore"
                            onClick={(e) => handleRestore(note.id, e)}
                            title="Restore"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </ActionButton>
                          <ActionButton
                            actionType="delete"
                            onClick={(e) => handlePermanentDelete(note.id, e)}
                            title="Permanently Delete"
                          >
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

      {/* ── EDITOR DIALOG ───────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent aria-describedby={undefined} className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          <DialogHeader className="p-4 border-b border-border bg-muted/10 shrink-0 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="sr-only">Edit Note</DialogTitle>
            <div className="flex-1 pr-4">
              <input
                type="text"
                value={localTitle}
                onChange={(e) => {
                  setLocalTitle(e.target.value);
                }}
                className="bg-transparent text-xl font-bold tracking-tight focus:outline-none w-full placeholder:text-muted-foreground"
                placeholder={t("untitled")}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0 mr-11">
              {isDirty && <span className="text-xs text-muted-foreground mr-2">Unsaved changes (Ctrl+S)</span>}
              <Button
                size="sm"
                variant={isDirty ? "default" : "secondary"}
                onClick={handleSave}
                disabled={!isDirty || updateStatus === "executing"}
              >
                {updateStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden relative p-4 bg-background">
            <MarkdownEditor
              value={localContent}
              onChange={(val) => {
                setLocalContent(val);
              }}
              activeTab={editorTab}
              onTabChange={setEditorTab}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
    </div>
  );
}
