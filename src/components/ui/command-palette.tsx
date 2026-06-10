"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { 
  FileText, 
  CheckSquare, 
  Search,
  FolderOpen,
  Loader2,
  Calendar,
  CreditCard,
  Settings
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { globalSearchAction } from "@/lib/actions/search";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const router = useRouter();
  
  const { execute, status, result } = useAction(globalSearchAction);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    const openMenu = () => setOpen(true);

    document.addEventListener("keydown", down);
    document.addEventListener("open-command-palette", openMenu);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("open-command-palette", openMenu);
    };
  }, []);

  React.useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearch("");
      return;
    }
    const timer = setTimeout(() => {
      if (search.trim().length > 0) {
        execute({ query: search });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, open, execute]);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  const hasSearchResults = result.data && (
    (result.data.tasks?.length ?? 0) > 0 || 
    (result.data.notes?.length ?? 0) > 0 || 
    (result.data.documents?.length ?? 0) > 0
  );
  
  return (
    <>
      <Command.Dialog 
        open={open} 
        onOpenChange={setOpen}
        shouldFilter={false} // We handle filtering manually via server action
        filter={() => 1} // Fallback to completely disable internal filtering
        label="Global Command Menu"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-[100] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-5 w-5 shrink-0 text-muted-foreground" />
          <Command.Input 
            value={search}
            onValueChange={setSearch}
            placeholder="Search tasks, notes, or navigate..." 
            className="flex h-14 w-full rounded-md bg-transparent py-3 text-lg outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          {status === "executing" && (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2 shrink-0" />
          )}
        </div>
        <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2 scroll-smooth">
          {search.trim().length > 0 && !hasSearchResults && status !== "executing" && (
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found for &quot;{search}&quot;.
            </Command.Empty>
          )}

          {/* SEARCH RESULTS */}
          {search.trim().length > 0 && result.data?.tasks && result.data.tasks.length > 0 && (
            <Command.Group heading="Tasks" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              {result.data.tasks.map((task) => (
                <Command.Item
                  key={task.id}
                  value={task.id}
                  onSelect={() => runCommand(() => router.push(`/tasks?id=${task.id}`))}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                >
                  <CheckSquare className="mr-2 h-4 w-4 text-indigo-500" />
                  <span className="truncate">{task.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {search.trim().length > 0 && result.data?.notes && result.data.notes.length > 0 && (
            <Command.Group heading="Notes" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              {result.data.notes.map((note) => (
                <Command.Item
                  key={note.id}
                  value={`note-${note.id}`}
                  onSelect={() => runCommand(() => router.push(`/notes?id=${note.id}`))}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                >
                  <FileText className="mr-2 h-4 w-4 text-emerald-500" />
                  <span className="truncate">{note.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {search.trim().length > 0 && result.data?.documents && result.data.documents.length > 0 && (
            <Command.Group heading="Documents" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              {result.data.documents.map((doc) => (
                <Command.Item
                  key={doc.id}
                  value={`doc-${doc.id}`}
                  onSelect={() => runCommand(() => router.push(`/documents?id=${doc.id}`))}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                >
                  <FolderOpen className="mr-2 h-4 w-4 text-amber-500" />
                  <span className="truncate">{doc.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* DEFAULT NAVIGATION (Hidden when searching to reduce clutter, or we could keep it if we want) */}
          {search.trim().length === 0 && (
            <>
              <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
                <Command.Item
                  onSelect={() => runCommand(() => router.push("/tasks"))}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  <span>Tasks</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push("/notes"))}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Notes</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push("/calendar"))}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Calendar</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push("/vault"))}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Vault</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push("/documents"))}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span>Documents</span>
                </Command.Item>
              </Command.Group>
              
              <Command.Group heading="Settings" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
                <Command.Item
                  onSelect={() => runCommand(() => router.push("/settings"))}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>System Settings</span>
                </Command.Item>
              </Command.Group>
            </>
          )}
        </Command.List>
      </Command.Dialog>
      
      {open && (
        <div className="fixed inset-0 z-[99] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      )}
    </>
  );
}
