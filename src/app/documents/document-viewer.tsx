"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialogs } from "@/components/providers/dialog-provider";
import { Document } from "@/lib/db/schema";
import { RotateCw, RotateCcw, ZoomIn, ZoomOut, FileWarning, Download, X, Loader2, Pencil, Save } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import { useAction } from "next-safe-action/hooks";
import { updateDocumentContentAction, renameDocumentAction } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/editor/markdown";

// Helper to check if file is an office doc
const isOfficeDoc = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ["docx", "xlsx", "pptx", "doc", "xls", "ppt"].includes(ext || "");
};

const isImage = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"].includes(ext || "");
};

const isVideo = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ["mp4", "webm", "ogg", "mov"].includes(ext || "");
};

const isAudio = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ["mp3", "wav", "ogg", "m4a"].includes(ext || "");
};

const isPdf = (name: string) => {
  return name.toLowerCase().endsWith(".pdf");
};

const isText = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ["txt", "md", "csv", "json", "xml", "html", "css", "js", "ts", "jsx", "tsx", "yaml", "yml"].includes(ext || "");
};



interface DocumentViewerProps {
  selectedDoc: Document | null;
  onClose: () => void;
}

export default function DocumentViewer({ selectedDoc, onClose }: DocumentViewerProps) {
  const { alert } = useDialogs();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isTextLoading, setIsTextLoading] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [localContent, setLocalContent] = useState("");
  const [localName, setLocalName] = useState("");

  const { executeAsync: execUpdateContent, status: updateStatus } = useAction(updateDocumentContentAction);
  const { executeAsync: execRename, status: renameStatus } = useAction(renameDocumentAction);

  useEffect(() => {
    if (selectedDoc) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalName(selectedDoc.name);
    }
  }, [selectedDoc]);

  useEffect(() => {
    if (textContent !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalContent(textContent);
    }
  }, [textContent]);

  const handleEditClick = () => {
    setLocalContent(textContent || "");
    setLocalName(selectedDoc?.name || "");
    setIsEditing(true);
    setEditorTab("write");
  };

  const isDirty = Boolean((selectedDoc && localName !== selectedDoc.name) || (selectedDoc && isText(selectedDoc.name) && textContent !== null && localContent !== textContent));

  const handleSaveEdit = useCallback(async () => {
    if (!selectedDoc || !isDirty) return;
    
    let contentSuccess = true;
    let renameSuccess = true;

    if (localName.trim() && localName !== selectedDoc.name) {
      const res = await execRename({ id: selectedDoc.id, name: localName.trim() });
      if (!res?.data?.success) renameSuccess = false;
    }

    if (isText(selectedDoc.name) && localContent !== textContent) {
      const res = await execUpdateContent({ id: selectedDoc.id, content: localContent });
      if (!res?.data?.success) contentSuccess = false;
      else setTextContent(localContent);
    }
    
    if (!contentSuccess || !renameSuccess) {
      console.error("Failed to save document changes");
      await alert("Failed to save changes");
    } else {
      setIsEditing(false);
    }
  }, [selectedDoc, isDirty, localName, localContent, textContent, execRename, execUpdateContent, alert]);

  const handleCloseViewer = () => {
    if (isDirty) {
      handleSaveEdit();
    }
    onClose();
    setZoom(1);
    setRotation(0);
    setTextContent(null);
    setIsEditing(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        if (selectedDoc && isDirty) {
          e.preventDefault();
          handleSaveEdit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDoc, isDirty, localName, localContent, textContent, handleSaveEdit]);

  const handleDownload = async () => {
    if (!selectedDoc) return;
    try {
      setIsDownloading(true);
      const res = await fetch(selectedDoc.url);
      const blob = await res.blob();
      saveAs(blob, selectedDoc.name);
    } catch (e) {
      console.error("Download failed", e);
      const a = window.document.createElement("a");
      a.href = selectedDoc.url;
      a.download = selectedDoc.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!selectedDoc || !isImage(selectedDoc.name)) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setZoom((z) => Math.min(3, z + 0.1));
        } else if (e.key === "-") {
          e.preventDefault();
          setZoom((z) => Math.max(0.5, z - 0.1));
        }
      }
    };

    const handleGlobalWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((z) => Math.max(0.5, Math.min(3, z + zoomDelta)));
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("wheel", handleGlobalWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleGlobalWheel);
    };
  }, [selectedDoc]);

  useEffect(() => {
    if (!selectedDoc || !isText(selectedDoc.name)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTextContent(null);
      return;
    }
    
    setIsTextLoading(true);
    fetch(selectedDoc.url)
      .then(r => r.text())
      .then(text => {
        setTextContent(text);
      })
      .catch(e => {
        console.error("Failed to load text content", e);
        setTextContent("Error loading text content.");
      })
      .finally(() => {
        setIsTextLoading(false);
      });
  }, [selectedDoc]);

  return (
    <Dialog open={!!selectedDoc} onOpenChange={handleCloseViewer}>
      <DialogContent aria-describedby={undefined} className="max-w-[90vw] w-full h-[90vh] flex flex-col p-0 overflow-hidden bg-background rounded-2xl shadow-2xl outline-none focus:outline-none focus-visible:outline-none [&>button.absolute]:hidden">
        <DialogHeader className="p-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center justify-between w-full">
            {isEditing ? (
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                className="bg-transparent text-xl font-bold tracking-tight focus:outline-none w-full placeholder:text-muted-foreground"
                placeholder="Untitled Document"
                autoFocus
              />
            ) : (
              <DialogTitle className="truncate pr-4">{selectedDoc?.name}</DialogTitle>
            )}

            <div className="flex items-center gap-4">
              {selectedDoc && (
                isEditing ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={updateStatus === "executing" || renameStatus === "executing"}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant={isDirty ? "default" : "secondary"}
                      onClick={handleSaveEdit}
                      disabled={!isDirty || updateStatus === "executing" || renameStatus === "executing"}
                      className="flex items-center gap-2"
                    >
                      {(updateStatus === "executing" || renameStatus === "executing") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="hidden sm:inline">Save</span>
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50"
                    title="Edit Document"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )
              )}
              {selectedDoc && isImage(selectedDoc.name) && (
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-1 shadow-sm mr-2 hidden sm:flex">
                <button
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  title="Zoom Out (Ctrl + Scroll Down)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  title="Zoom In (Ctrl + Scroll Up)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button
                  onClick={() => setRotation(r => r - 90)}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation(r => r + 90)}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation(r => r + 180)}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  title="Rotate 180°"
                >
                  <RotateCw className="w-4 h-4 text-muted-foreground" />
                  <span className="sr-only">Rotate 180</span>
                </button>
              </div>
              )}

              <button
                onClick={handleCloseViewer}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground opacity-70 transition-all hover:bg-destructive hover:text-destructive-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring ml-2"
                title="Close"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        <div 
          className="flex-1 bg-black/5 flex items-center justify-center overflow-hidden relative cursor-move"
        >
          {selectedDoc && (
            <div
              className="w-full h-full flex items-center justify-center origin-center transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              {isOfficeDoc(selectedDoc.name) ? (
                typeof window !== "undefined" && (
                  window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1" || 
                  window.location.hostname.startsWith("192.168.") || 
                  window.location.hostname.startsWith("10.")
                ) ? (
                  <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground w-full h-full bg-background/50">
                    <FileWarning className="w-16 h-16 text-muted-foreground/50" />
                    <h3 className="text-xl font-medium text-foreground">Local Preview Unavailable</h3>
                    <p className="max-w-md text-center text-sm leading-relaxed">
                      Office document previews require a public URL. Since you are running this application locally on your network, Microsoft&apos;s preview server cannot access the file.
                    </p>
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg shadow-md hover:bg-primary/90 transition-all font-medium hover:shadow-lg disabled:opacity-50"
                    >
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Download File
                    </button>
                  </div>
                ) : (
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                      typeof window !== "undefined" ? window.location.origin + selectedDoc.url : selectedDoc.url
                    )}`}
                    className="w-full h-full border-0 bg-white"
                    title={selectedDoc.name}
                  />
                )
              ) : isImage(selectedDoc.name) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedDoc.url}
                  alt={selectedDoc.name}
                  className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-md rounded-md"
                />
              ) : isVideo(selectedDoc.name) ? (
                <video
                  src={selectedDoc.url}
                  controls
                  className="max-w-full max-h-full outline-none shadow-md rounded-md"
                />
              ) : isAudio(selectedDoc.name) ? (
                <audio
                  src={selectedDoc.url}
                  controls
                  className="outline-none"
                />
              ) : isPdf(selectedDoc.name) ? (
                <iframe
                  src={selectedDoc.url}
                  className="w-full h-full border-0 bg-white rounded-b-2xl"
                  title={selectedDoc.name}
                />
              ) : isText(selectedDoc.name) ? (
                <div className="w-full h-full bg-background overflow-hidden rounded-b-2xl border-t border-border flex flex-col text-left select-text cursor-auto">
                  {isTextLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6">
                      <Loader2 className="w-8 h-8 animate-spin mb-4" />
                      <span className="font-medium">Loading text content...</span>
                    </div>
                  ) : isEditing ? (
                    <div className="flex-1 overflow-hidden p-4">
                      <MarkdownEditor
                        value={localContent}
                        onChange={setLocalContent}
                        activeTab={editorTab}
                        onTabChange={setEditorTab}
                        className="h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full overflow-auto p-6 select-text cursor-text">
                      <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words max-w-none">
                        {textContent}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground w-full h-full bg-background/50">
                  <FileWarning className="w-16 h-16 text-muted-foreground/50" />
                  <h3 className="text-xl font-medium text-foreground">Preview Unavailable</h3>
                  <p className="max-w-md text-center text-sm leading-relaxed text-muted-foreground">
                    This file type cannot be previewed directly in the browser. Please download it to view its contents.
                  </p>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg shadow-md hover:bg-primary/90 transition-all font-medium hover:shadow-lg disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
