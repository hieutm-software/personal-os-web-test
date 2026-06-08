"use client";

import { 
  deleteDocumentAction, bulkDeleteDocumentsAction, getUploadUrlAction, finalizeUploadAction, 
  createFolderAction, renameFolderAction, deleteFolderAction, moveDocumentAction,
  restoreDocumentsAction, restoreFoldersAction, permanentlyDeleteDocumentsAction,
  permanentlyDeleteFoldersAction, emptyDocumentsTrashAction
} from "@/lib/actions/documents";
import { Document, DocumentFolder } from "@/lib/db/schema";
import { 
  Trash2, Search, Download, FileText, ChevronUp, ChevronDown, 
  Loader2, Upload, Folder as FolderIcon, ChevronRight, FolderPlus,
  Pencil, FolderUp, MoreHorizontal, RefreshCcw
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import React, { useRef, useState, useMemo, useEffect, useLayoutEffect } from "react";
import dynamic from "next/dynamic";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { useDialogs } from "@/components/providers/dialog-provider";
import { PageLayout } from "@/components/ui/page-layout";
import { Toolbar } from "@/components/ui/toolbar";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/data-table";
const DocumentViewer = dynamic(() => import("./document-viewer"), { ssr: false });

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (dateString: string | Date) => {
  const d = new Date(dateString);
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${MM}/${dd}/${yyyy} ${HH}:${mm}`;
};



type SortKey = "name" | "mimeType" | "sizeBytes" | "updatedAt";
type SortDirection = "asc" | "desc";

type MixedItem = {
  type: "folder" | "document";
  id: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  updatedAt: string;
  url?: string;
  item: Document | DocumentFolder;
};

export default function DocumentsClient({ initialDocs, initialFolders }: { initialDocs: Document[], initialFolders: DocumentFolder[] }) {
  const { alert, confirm } = useDialogs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "trash">("active");
  
  // Sync selectedDoc when initialDocs updates (e.g. after rename)
  useEffect(() => {
    if (selectedDoc) {
      const updatedDoc = initialDocs.find(d => d.id === selectedDoc.id);
      if (updatedDoc && (updatedDoc.name !== selectedDoc.name || updatedDoc.updatedAt !== selectedDoc.updatedAt)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedDoc(updatedDoc);
      }
    }
  }, [initialDocs, selectedDoc]);
  
  
  const breadcrumbContainerRef = useRef<HTMLDivElement>(null);
  const [maxVisibleCrumbs, setMaxVisibleCrumbs] = useState<number>(100);
  
  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "updatedAt",
    direction: "desc"
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Modal States
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<DocumentFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  // Folder Upload Progress
  const [isUploadingFolder, setIsUploadingFolder] = useState(false);

  const { executeAsync: execGetUploadUrl } = useAction(getUploadUrlAction);
  const { executeAsync: execFinalizeUpload } = useAction(finalizeUploadAction);
  const { execute: execDelete } = useAction(deleteDocumentAction);
  const { execute: execBulkDelete, status: bulkDeleteStatus } = useAction(bulkDeleteDocumentsAction);
  const { execute: execRenameFolder } = useAction(renameFolderAction);
  const { execute: execDeleteFolder } = useAction(deleteFolderAction);
  const { execute: execMoveDoc } = useAction(moveDocumentAction);

  const { executeAsync: execRestoreDocs, status: restoreDocsStatus } = useAction(restoreDocumentsAction);
  const { executeAsync: execRestoreFolders, status: restoreFoldersStatus } = useAction(restoreFoldersAction);
  const { executeAsync: execPermDeleteDocs, status: permDeleteDocsStatus } = useAction(permanentlyDeleteDocumentsAction);
  const { executeAsync: execPermDeleteFolders, status: permDeleteFoldersStatus } = useAction(permanentlyDeleteFoldersAction);
  const { executeAsync: execEmptyTrash, status: emptyTrashStatus } = useAction(emptyDocumentsTrashAction);

  // Compute breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: {id: string | null, name: string}[] = [{id: null, name: "Home"}];
    let currId = currentFolderId;
    const path: typeof crumbs = [];
    while (currId) {
      const folder = initialFolders.find(f => f.id === currId);
      if (!folder) break;
      path.unshift({ id: folder.id, name: folder.name });
      currId = folder.parentId;
    }
    return [...crumbs, ...path];
  }, [currentFolderId, initialFolders]);

  const [lastFolderId, setLastFolderId] = useState<string | null | undefined>(undefined);
  if (currentFolderId !== lastFolderId) {
    setMaxVisibleCrumbs(breadcrumbs.length);
    setLastFolderId(currentFolderId);
  }

  useLayoutEffect(() => {
    if (breadcrumbContainerRef.current) {
      const container = breadcrumbContainerRef.current;
      if (container.scrollWidth > container.clientWidth && maxVisibleCrumbs > 2) {
        setMaxVisibleCrumbs(prev => prev - 1);
      }
    }
  }, [maxVisibleCrumbs, breadcrumbs, searchQuery]);

  useEffect(() => {
    const handleResize = () => setMaxVisibleCrumbs(breadcrumbs.length);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breadcrumbs.length]);

  const items: MixedItem[] = useMemo(() => {
    const result: MixedItem[] = [];
    
    let currentFolders = initialFolders;
    let currentDocs = initialDocs;

    if (viewMode === "active") {
      currentFolders = currentFolders.filter(f => !f.deletedAt && f.parentId === currentFolderId);
      currentDocs = currentDocs.filter(d => !d.deletedAt && d.folderId === currentFolderId);
    } else {
      currentFolders = currentFolders.filter(f => f.deletedAt);
      currentDocs = currentDocs.filter(d => d.deletedAt);
    }

    // Apply Search
    let docsToMap = currentDocs;
    let foldersToMap = currentFolders;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const allActiveDocs = viewMode === "active" ? initialDocs.filter(d => !d.deletedAt) : currentDocs;
      const allActiveFolders = viewMode === "active" ? initialFolders.filter(f => !f.deletedAt) : currentFolders;
      
      docsToMap = allActiveDocs.filter(d => d.name.toLowerCase().includes(q) || (d.mimeType && d.mimeType.toLowerCase().includes(q)));
      foldersToMap = allActiveFolders.filter(f => f.name.toLowerCase().includes(q));
    }

    foldersToMap.forEach(f => {
      result.push({
        type: "folder",
        id: f.id,
        name: f.name,
        updatedAt: f.updatedAt,
        item: f
      });
    });

    docsToMap.forEach(d => {
      result.push({
        type: "document",
        id: d.id,
        name: d.name,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        updatedAt: d.updatedAt,
        url: d.url,
        item: d
      });
    });

    return result;
  }, [initialDocs, initialFolders, currentFolderId, searchQuery, viewMode]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.type === "folder" && b.type === "document") return -1;
      if (a.type === "document" && b.type === "folder") return 1;

      let comparison = 0;
      if (sortConfig.key === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      } else if (sortConfig.key === "mimeType") {
        comparison = (a.mimeType || "").localeCompare(b.mimeType || "");
      } else if (sortConfig.key === "sizeBytes") {
        comparison = (a.sizeBytes || 0) - (b.sizeBytes || 0);
      } else if (sortConfig.key === "updatedAt") {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [items, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const renderSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) return null;
    return (
      <span className="text-muted-foreground">
        {sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </span>
    );
  };

  const uploadFilesWithHierarchy = async (files: File[]) => {
    setIsUploadingFolder(true);
    try {
      const folderPaths = new Set<string>();

      for (const file of files) {
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split('/');
          parts.pop(); // Remove file name
          if (parts.length > 0) {
             folderPaths.add(parts.join('/'));
          }
        }
      }

      const folderPathToId = new Map<string, string>();
      folderPathToId.set("", currentFolderId || "");

      if (folderPaths.size > 0) {
        const sortedPaths = Array.from(folderPaths).sort((a, b) => a.split('/').length - b.split('/').length);
        
        for (const p of sortedPaths) {
          const parts = p.split('/');
          const name = parts.pop()!;
          const parentPath = parts.join('/');
          const parentId = folderPathToId.get(parentPath) || currentFolderId;
          
          const res = await createFolderAction({ name, parentId });
          if (res?.data?.success && res.data.folderId) {
            folderPathToId.set(p, res.data.folderId);
          }
        }
      }

      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
      const MAX_TOTAL_STORAGE = 100 * 1024 * 1024; // 100MB
      let currentTotalUsed = initialDocs.reduce((sum, doc) => sum + doc.sizeBytes, 0);

      const uploadPromises = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > MAX_FILE_SIZE) {
          await alert(`File "${file.name}" exceeds the 25MB limit.`);
          continue;
        }

        if (currentTotalUsed + file.size > MAX_TOTAL_STORAGE) {
          await alert(`Upload of "${file.name}" failed: Total storage limit of 100MB exceeded.`);
          break; // Stop further uploads to prevent spamming alerts
        }

        currentTotalUsed += file.size;

        let targetFolderId = currentFolderId;
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split('/');
          parts.pop();
          const p = parts.join('/');
          targetFolderId = folderPathToId.get(p) || currentFolderId;
        }
        
        const mimeType = file.type || 'application/octet-stream';
        
        const uploadTask = async () => {
          const res = await execGetUploadUrl({
            name: file.name,
            sizeBytes: file.size,
            folderId: targetFolderId,
          });

          if (res?.data?.success && res.data.signedUrl) {
            const uploadRes = await fetch(res.data.signedUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': mimeType,
              },
            });

            if (uploadRes.ok && res.data.supabasePath) {
              await execFinalizeUpload({
                supabasePath: res.data.supabasePath,
                name: file.name,
                mimeType,
                sizeBytes: file.size,
                folderId: targetFolderId,
              });
            } else {
               console.error(`Failed to upload file ${file.name}`);
            }
          } else {
             console.error(`Failed to get upload URL for ${file.name}`);
          }
        };

        uploadPromises.push(uploadTask());
      }
      
      await Promise.all(uploadPromises);
    } finally {
      setIsUploadingFolder(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    await uploadFilesWithHierarchy(Array.from(files));
  };

  const handleCreateFolderSubmit = async () => {
    if (newFolderName) {
      await createFolderAction({ name: newFolderName, parentId: currentFolderId });
      setCreateFolderOpen(false);
      setNewFolderName("");
    }
  };

  const handleRenameFolderSubmit = async () => {
    if (renameFolderName && folderToRename && renameFolderName !== folderToRename.name) {
      execRenameFolder({ id: folderToRename.id, name: renameFolderName });
      setRenameFolderOpen(false);
      setFolderToRename(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, item: MixedItem) => {
    e.stopPropagation();
    const isTrash = viewMode === "trash";
    
    if (isTrash) {
      const title = "Delete Item";
      const confirmText = "Delete";
      const msg = "Are you sure you want to permanently delete this item?";
      
      if (!(await confirm(msg, { title, confirmText, variant: "destructive" }))) return;
    }

    if (viewMode === "active") {
      if (item.type === "document") {
        execDelete({ id: item.id });
      } else {
        execDeleteFolder({ id: item.id });
      }
    } else {
        if (item.type === "document") {
          await execPermDeleteDocs({ ids: [item.id] });
        } else {
          await execPermDeleteFolders({ ids: [item.id] });
        }
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  };

  const handleRestore = async (e: React.MouseEvent, item: MixedItem) => {
    e.stopPropagation();
    if (await confirm(`Are you sure you want to restore "${item.name}"?`, { title: "Restore Item", confirmText: "Restore", variant: "default" })) {
      if (item.type === "document") {
        await execRestoreDocs({ ids: [item.id] });
      } else {
        await execRestoreFolders({ ids: [item.id] });
      }
    }
  };

  const handleDeleteClick = async () => {
    const ids = selectedIds.size > 0 ? selectedIds : new Set(items.map((i) => i.id));
    if (ids.size === 0) return;
    
    const isTrash = viewMode === "trash";
    
    if (isTrash) {
      const title = `Delete ${ids.size} Items`;
      const confirmText = "Delete";
      const msg = `Are you sure you want to permanently delete ${ids.size} selected item(s)?`;

      if (!(await confirm(msg, { title, confirmText, variant: "destructive" }))) return;
    }

    const docIds = Array.from(ids).filter(id => items.find(i => i.id === id)?.type === "document");
    const folderIds = Array.from(ids).filter(id => items.find(i => i.id === id)?.type === "folder");

    if (viewMode === "active") {
      if (docIds.length > 0) {
        execBulkDelete({ ids: docIds });
      }
      if (folderIds.length > 0) {
        folderIds.forEach(fid => execDeleteFolder({ id: fid }));
      }
    } else {
        if (docIds.length > 0) await execPermDeleteDocs({ ids: docIds });
        if (folderIds.length > 0) await execPermDeleteFolders({ ids: folderIds });
    }
    setSelectedIds(new Set());
  };

  const handleDownloadClick = () => {
    if (selectedIds.size === 0) {
      performDownload(items.map((i) => i.id), "all_files");
    } else {
      performDownload(Array.from(selectedIds), "selected_files");
    }
  };

  const handleRestoreAllClick = async () => {
    if (selectedIds.size > 0) {
      if (await confirm(`Are you sure you want to restore ${selectedIds.size} selected item(s)?`, { title: `Restore ${selectedIds.size} Items`, confirmText: "Restore", variant: "default" })) {
        const ids = Array.from(selectedIds);
        const docs = ids.filter(id => items.find(i => i.id === id)?.type === "document");
        const folders = ids.filter(id => items.find(i => i.id === id)?.type === "folder");
        if (docs.length > 0) await execRestoreDocs({ ids: docs });
        if (folders.length > 0) await execRestoreFolders({ ids: folders });
        setSelectedIds(new Set());
      }
    } else {
      if (await confirm("Are you sure you want to restore all items from the Trash?", { title: "Restore All", confirmText: "Restore", variant: "default" })) {
        const docs = items.filter(i => i.type === "document").map(i => i.id);
        const folders = items.filter(i => i.type === "folder").map(i => i.id);
        if (docs.length > 0) await execRestoreDocs({ ids: docs });
        if (folders.length > 0) await execRestoreFolders({ ids: folders });
      }
    }
  };

  const handleEmptyTrashClick = async () => {
    if (await confirm("Are you sure you want to permanently delete all items in the Trash?", { title: "Empty Trash", confirmText: "Empty Trash", variant: "destructive" })) {
      execEmptyTrash();
    }
  };


  const downloadDoc = async (doc: Document) => {
    // Force native download manager
    const downloadUrl = doc.url.includes("?") ? `${doc.url}&download=true` : `${doc.url}?download=true`;
    const a = window.document.createElement("a");
    a.href = downloadUrl;
    a.download = doc.name;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const performDownload = async (itemIds: string[], zipName: string = "download") => {
    setIsZipping(true);
    try {
      const selectedDocs = items.filter(i => itemIds.includes(i.id) && i.type === "document").map(i => i.item as Document);
      const selectedFolderIds = items.filter(i => itemIds.includes(i.id) && i.type === "folder").map(i => i.id);

      if (selectedDocs.length === 1 && selectedFolderIds.length === 0) {
        await downloadDoc(selectedDocs[0]);
        setIsZipping(false);
        return;
      }

      if (selectedDocs.length === 0 && selectedFolderIds.length === 0) {
        setIsZipping(false);
        return;
      }

      const zip = new JSZip();

      const fetchBlob = async (url: string) => {
        const res = await fetch(url);
        return res.blob();
      };

      const docPromises = selectedDocs.map(async (doc) => {
        const blob = await fetchBlob(doc.url);
        zip.file(doc.name, blob);
      });
      await Promise.all(docPromises);

      const addFolderToZip = async (folderId: string, currentZipFolder: JSZip) => {
        const subfolders = initialFolders.filter(f => f.parentId === folderId);
        
        const folderPromises = subfolders.map(async (sf) => {
          const newZipFolder = currentZipFolder.folder(sf.name);
          if (newZipFolder) {
             await addFolderToZip(sf.id, newZipFolder);
          }
        });
        
        const docs = initialDocs.filter(d => d.folderId === folderId);
        const docPromisesInFolder = docs.map(async (doc) => {
          const blob = await fetchBlob(doc.url);
          currentZipFolder.file(doc.name, blob);
        });

        await Promise.all([...folderPromises, ...docPromisesInFolder]);
      };

      for (const folderId of selectedFolderIds) {
         const folderInfo = initialFolders.find(f => f.id === folderId);
         if (folderInfo) {
           const zipFolder = zip.folder(folderInfo.name);
           if (zipFolder) {
             await addFolderToZip(folderId, zipFolder);
           }
         }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${zipName}.zip`);

    } catch (e) {
      console.error(e);
      await alert("Failed to create zip file");
    } finally {
      setIsZipping(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const items = Array.from(e.dataTransfer.items);
      const files: File[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const traverseFileTree = (item: any, path: string = "") => {
        return new Promise<void>((resolve) => {
          if (item.isFile) {
            item.file((file: File) => {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: path + file.name,
                writable: false
              });
              files.push(file);
              resolve();
            });
          } else if (item.isDirectory) {
            const dirReader = item.createReader();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dirReader.readEntries(async (entries: any[]) => {
              for (const entry of entries) {
                await traverseFileTree(entry, path + item.name + "/");
              }
              resolve();
            });
          } else {
             resolve();
          }
        });
      };

      for (const item of items) {
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            await traverseFileTree(entry);
          }
        }
      }

      if (files.length > 0) {
        await uploadFilesWithHierarchy(files);
      }
    }
  };

  const handleItemDragStart = (e: React.DragEvent, item: MixedItem) => {
    if (viewMode === "trash") {
      e.preventDefault();
      return;
    }
    if (item.type === "document") {
      setDraggedItemId(item.id);
      e.dataTransfer.setData("text/plain", item.id);
      e.dataTransfer.effectAllowed = "move";
    } else {
      e.preventDefault(); // Don't allow dragging folders for now
    }
  };

  const handleItemDragOver = (e: React.DragEvent, item: MixedItem) => {
    e.preventDefault();
    if (item.type === "folder" && item.id !== draggedItemId) {
      setDragOverFolderId(item.id);
    }
  };

  const handleItemDragLeave = (e: React.DragEvent, item: MixedItem) => {
    if (item.id === dragOverFolderId) {
      setDragOverFolderId(null);
    }
  };

  const handleItemDrop = async (e: React.DragEvent, item: MixedItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    if (viewMode === "trash") return;
    
    if (item.type === "folder" && draggedItemId) {
      // Move document to folder
      await execMoveDoc({ documentId: draggedItemId, folderId: item.id });
      setDraggedItemId(null);
    }
  };

  const handleItemDragEnd = () => {
    setDraggedItemId(null);
    setDragOverFolderId(null);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <FolderIcon className="w-6 h-6 text-primary" />
          Documents
        </div>
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
          <Button
            variant={viewMode === "active" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("active"); setSelectedIds(new Set()); setCurrentFolderId(null); }}
            className={viewMode === "active" ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground"}
          >
            <FolderIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Documents</span>
          </Button>
          <Button
            variant={viewMode === "trash" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("trash"); setSelectedIds(new Set()); setCurrentFolderId(null); }}
            className={viewMode === "trash" ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground"}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Trash</span>
          </Button>
        </div>
      </div>
      <PageLayout
        className={cn(
          "rounded-xl border shadow-sm relative h-full",
          isDraggingOver ? "border-primary border-2 bg-primary/5" : "border-border"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
      
      <Toolbar
        search={
          <SearchBar
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search documents..."
            containerClassName="w-full sm:max-w-xs"
          />
        }
        actions={
          <>

            {viewMode === "active" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewFolderName("");
                    setCreateFolderOpen(true);
                  }}
                  title="New Folder"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="hidden lg:inline">New Folder</span>
                </Button>

                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <input
                  type="file"
                  multiple

                  // @ts-expect-error react types don't support webkitdirectory
                  webkitdirectory=""
                  directory=""
                  ref={folderInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={isUploadingFolder}
                  title="Upload Folder"
                >
                  {isUploadingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderUp className="w-4 h-4" />}
                  <span className="hidden lg:inline">Upload Folder</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFolder}
                  title="Upload Files"
                >
                  {isUploadingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span className="hidden lg:inline">Upload Files</span>
                </Button>
              </>
            )}

            {viewMode === "active" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadClick}
                  disabled={isZipping || items.length === 0}
                  title={selectedIds.size > 0 ? `Download (${selectedIds.size})` : "Download All"}
                >
                  {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="hidden lg:inline">
                    {selectedIds.size > 0 ? `Download (${selectedIds.size})` : "Download All"}
                  </span>
                </Button>
                <Button
                  variant="destructive-outline"
                  size="sm"
                  onClick={handleDeleteClick}
                  disabled={bulkDeleteStatus === "executing" || items.length === 0}
                  title={selectedIds.size > 0 ? "Delete Selected" : "Delete All"}
                >
                  {bulkDeleteStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span className="hidden lg:inline">
                    {selectedIds.size > 0 ? `Delete (${selectedIds.size})` : "Delete All"}
                  </span>
                </Button>
              </>
            )}

            {viewMode === "trash" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreAllClick()}
                  disabled={restoreDocsStatus === "executing" || restoreFoldersStatus === "executing" || items.length === 0}
                  title={selectedIds.size > 0 ? `Restore (${selectedIds.size})` : "Restore All"}
                  className="hover:text-emerald-500 hover:bg-emerald-500/10"
                >
                  {(restoreDocsStatus === "executing" || restoreFoldersStatus === "executing") ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  <span className="hidden lg:inline">{selectedIds.size > 0 ? `Restore (${selectedIds.size})` : "Restore All"}</span>
                </Button>
                <Button
                  variant="destructive-outline"
                  size="sm"
                  onClick={() => {
                    if (selectedIds.size > 0) {
                      handleDeleteClick();
                    } else {
                      handleEmptyTrashClick();
                    }
                  }}
                  disabled={emptyTrashStatus === "executing" || permDeleteDocsStatus === "executing" || permDeleteFoldersStatus === "executing" || items.length === 0}
                  title={selectedIds.size > 0 ? "Delete Permanently" : "Empty Trash"}
                >
                  {(emptyTrashStatus === "executing" || permDeleteDocsStatus === "executing" || permDeleteFoldersStatus === "executing") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span className="hidden lg:inline">{selectedIds.size > 0 ? `Delete (${selectedIds.size})` : "Empty Trash"}</span>
                </Button>
              </>
            )}
          </>
        }
      />

      {/* ── FILE EXPLORER (TABLE VIEW) ──────────────────────────────────── */}
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
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-2">
                  Name
                  {renderSortIcon("name")}
                </div>
              </TableHead>
              <TableHead 
                className="w-[160px] min-w-[160px] hidden lg:table-cell cursor-pointer group"
                onClick={() => handleSort("updatedAt")}
              >
                <div className="flex items-center gap-2">
                  Modified
                  {renderSortIcon("updatedAt")}
                </div>
              </TableHead>
              <TableHead 
                className="w-[120px] min-w-[120px] hidden md:table-cell cursor-pointer group"
                onClick={() => handleSort("sizeBytes")}
              >
                <div className="flex items-center gap-2">
                  Size
                  {renderSortIcon("sizeBytes")}
                </div>
              </TableHead>
              <TableHead className="w-[160px] min-w-[160px] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow className="hover:bg-transparent cursor-default">
                  <TableCell colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    {searchQuery ? "No matching files found." : viewMode === "trash" ? "Trash is empty." : "This folder is empty. Drag and drop files or folders here to upload."}
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    draggable={item.type === "document"}
                    onDragStart={(e) => handleItemDragStart(e, item)}
                    onDragOver={(e) => handleItemDragOver(e, item)}
                    onDragLeave={(e) => handleItemDragLeave(e, item)}
                    onDrop={(e) => handleItemDrop(e, item)}
                    onDragEnd={handleItemDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey) {
                        e.preventDefault();
                        const currentIndex = sortedItems.findIndex(d => d.id === item.id);
                        const anchorId = lastSelectedId || sortedItems[0]?.id;
                        const lastIndex = sortedItems.findIndex(d => d.id === anchorId);
                        
                        if (currentIndex !== -1 && lastIndex !== -1) {
                          const start = Math.min(currentIndex, lastIndex);
                          const end = Math.max(currentIndex, lastIndex);
                          
                          const next = new Set<string>();
                          for (let i = start; i <= end; i++) {
                            next.add(sortedItems[i].id);
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
                      if (item.type === "folder") {
                        setCurrentFolderId(item.id);
                        setSelectedIds(new Set());
                        setSearchQuery("");
                      } else {
                        setSelectedDoc(item.item as Document);
                      }
                    }}
                    className={cn(
                      "group transition-colors border-l-2 cursor-pointer",
                      selectedIds.has(item.id) ? "bg-primary/5 border-l-primary" : "hover:bg-muted/50 border-l-transparent",
                      dragOverFolderId === item.id ? "bg-primary/20 ring-2 ring-primary ring-inset" : "",
                      draggedItemId === item.id ? "opacity-50" : ""
                    )}
                  >
                    <TableCell className="w-full max-w-[0px]">
                      <div className="flex items-center gap-3 w-full pl-2">
                        {item.type === "folder" ? (
                          <FolderIcon className="w-5 h-5 text-primary shrink-0 fill-primary/20" />
                        ) : (
                          <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                        <div className="truncate w-full font-normal">
                          {item.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground hidden lg:table-cell font-normal">
                      {formatDate(item.updatedAt)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-muted-foreground hidden md:table-cell font-normal">
                      {item.type === "folder" ? "" : formatBytes(item.sizeBytes!)}
                    </TableCell>
                    <TableCell className="text-left">
                      <div 
                        className="flex items-center justify-start gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onDoubleClick={(e) => e.stopPropagation()}
                      >
                        {viewMode === "active" ? (
                          <>
                            {item.type === "document" && (
                              <ActionButton
                                actionType="view"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDoc(item.item as Document);
                                }}
                                title="View Document"
                              >
                                <Search className="w-4 h-4" />
                              </ActionButton>
                            )}
                            <ActionButton
                              actionType="download"
                              onClick={(e) => {
                                e.stopPropagation();
                                performDownload([item.id], item.name);
                              }}
                              disabled={isZipping}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </ActionButton>
                            {item.type === "folder" && (
                              <ActionButton
                                actionType="edit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameFolderName(item.name);
                                  setFolderToRename(item.item as DocumentFolder);
                                  setRenameFolderOpen(true);
                                }}
                                title="Rename"
                              >
                                <Pencil className="w-4 h-4" />
                              </ActionButton>
                            )}
                            <ActionButton
                              actionType="delete"
                              onClick={(e) => handleDelete(e, item)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </ActionButton>
                          </>
                        ) : (
                          <>
                            <ActionButton
                              actionType="restore"
                              onClick={(e) => handleRestore(e, item)}
                              disabled={restoreDocsStatus === "executing" || restoreFoldersStatus === "executing"}
                              title="Restore"
                            >
                              <RefreshCcw className="w-4 h-4" />
                            </ActionButton>
                            <ActionButton
                              actionType="delete"
                              onClick={(e) => handleDelete(e, item)}
                              title="Delete Permanently"
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

        {/* ── FOOTER BREADCRUMBS ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 p-3 border-t border-border bg-muted/5 text-sm shrink-0 overflow-hidden w-full">
          {viewMode === "trash" ? (
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <Trash2 className="w-4 h-4" />
              Trash
            </div>
          ) : (
            <div 
              ref={breadcrumbContainerRef}
              className="flex items-center gap-2 text-muted-foreground font-medium flex-nowrap min-w-0 w-full overflow-hidden"
            >
            {(() => {
              let visibleCrumbs = breadcrumbs;
              const MAX_VISIBLE = Math.max(2, maxVisibleCrumbs);
              
              if (breadcrumbs.length > MAX_VISIBLE) {
                visibleCrumbs = [
                  breadcrumbs[0],
                  { id: 'ellipsis', name: '...' },
                  ...breadcrumbs.slice(-(MAX_VISIBLE - 2))
                ];
              }

              return visibleCrumbs.map((crumb, idx) => {
                const isRoot = crumb.id === null && crumb.name === "Home";
                const isEllipsis = crumb.id === 'ellipsis';

                return (
                  <div key={crumb.id || (isEllipsis ? 'ellipsis' : 'root')} className="flex items-center gap-1 shrink-0">
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />}
                    
                    {isEllipsis ? (
                      <div className="flex items-center justify-center px-1 shrink-0">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground/60" />
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setCurrentFolderId(crumb.id);
                          setSearchQuery("");
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedItemId && crumb.id !== currentFolderId) {
                            setDragOverFolderId(crumb.id || "root");
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverFolderId === (crumb.id || "root")) {
                            setDragOverFolderId(null);
                          }
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverFolderId(null);
                          if (draggedItemId && crumb.id !== currentFolderId) {
                            await execMoveDoc({ documentId: draggedItemId, folderId: crumb.id });
                            setDraggedItemId(null);
                          }
                        }}
                        className={cn(
                          "transition-colors flex items-center gap-1.5 shrink-0 text-left max-w-[300px] px-1.5 py-0.5 rounded-sm",
                          dragOverFolderId === (crumb.id || "root")
                            ? "bg-primary/20 text-foreground ring-1 ring-primary"
                            : "hover:text-foreground text-muted-foreground"
                        )}
                        title={isRoot ? "Home" : crumb.name}
                      >
                        {isRoot ? (
                          <FolderIcon className="w-4 h-4 shrink-0" />
                        ) : (
                          <span className="truncate block">{crumb.name}</span>
                        )}
                      </button>
                    )}
                  </div>
                );
              });
            })()}
            </div>
          )}
        </div>
      </PageLayout>

      {selectedDoc && (
        <DocumentViewer
          selectedDoc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* --- DIALOGS --- */}
      
      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolderSubmit()}
              placeholder="Folder name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolderSubmit} disabled={!newFolderName}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for &quot;{folderToRename?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              type="text"
              autoFocus
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameFolderSubmit()}
              placeholder="Folder name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFolderSubmit} disabled={!renameFolderName || renameFolderName === folderToRename?.name}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
