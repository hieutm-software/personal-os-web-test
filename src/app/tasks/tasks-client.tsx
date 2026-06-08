"use client";

import {
  bulkDeleteTasksAction,
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/lib/actions/tasks";
import { Task } from "@/lib/db/schema";
import { cn, formatDate } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronUp,
  ListTodo,
  Loader2,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
import { useDialogs } from "@/components/providers/dialog-provider";
import { PageLayout } from "@/components/ui/page-layout";
import { Toolbar } from "@/components/ui/toolbar";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/data-table";

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

const taskFormSchema = z.object({
  title: z.string().min(1, "Required"),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

type SortKey = "title" | "createdAt" | "status";
type SortDirection = "asc" | "desc";

// ============================================================================
// CONSTANTS & UTILS
// ============================================================================

const STATUS_STYLES: Record<Task["status"], string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  COMPLETED: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const NEXT_STATUS_MAP: Record<Task["status"], Task["status"]> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "PENDING",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const t = useTranslations("Tasks");
  const { confirm } = useDialogs();

  // ── STATE ─────────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useQueryState("status", {
    defaultValue: "ALL",
  });

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    task: Task | null;
  }>({ isOpen: false, task: null });

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({ key: "createdAt", direction: "desc" });

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { execute: execCreate, status: createStatus } = useAction(createTaskAction);
  const { execute: execUpdate, status: updateStatus } = useAction(updateTaskAction);
  const { execute: execDelete, status: deleteStatus } = useAction(deleteTaskAction);
  const { execute: execBulkDelete } = useAction(bulkDeleteTasksAction);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [lastSelectedTaskId, setLastSelectedTaskId] = useState<string | null>(null);

  // ── FORM ──────────────────────────────────────────────────────────────────
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: "", status: "PENDING" },
  });

  useEffect(() => {
    if (modalState.isOpen) {
      form.reset({
        title: modalState.task?.title || "",
        status: modalState.task?.status || "PENDING",
      });
    }
  }, [modalState, form]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleTaskCompletion = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    execUpdate({ id: task.id, status: NEXT_STATUS_MAP[task.status] });
  };

  const onSubmit = (data: TaskFormValues) => {
    if (modalState.task) {
      execUpdate({
        id: modalState.task.id,
        title: data.title,
      });
    } else {
      execCreate({
        title: data.title,
      });
    }
    setModalState({ isOpen: false, task: null });
  };

  // ── DERIVED STATE ─────────────────────────────────────────────────────────
  const sortedAndFilteredTasks = useMemo(() => {
    const filtered = initialTasks.filter((task) =>
      statusFilter === "ALL" ? true : task.status === statusFilter
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortConfig.key === "createdAt") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortConfig.key === "status") {
        comparison = a.status.localeCompare(b.status);
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [initialTasks, statusFilter, sortConfig]);

  // Clean up selected IDs if tasks are deleted or filtered out
  useEffect(() => {
    setTimeout(() => {
      setSelectedTaskIds((prev) => {
        const validIds = new Set(sortedAndFilteredTasks.map((t) => t.id));
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

      setLastSelectedTaskId((prev) => {
        if (prev && !sortedAndFilteredTasks.some((t) => t.id === prev)) {
          return null;
        }
        return prev;
      });
    }, 0);
  }, [sortedAndFilteredTasks]);

  const handleRowClick = (e: React.MouseEvent, taskId: string, index: number) => {
    e.stopPropagation();

    if (e.shiftKey) {
      e.preventDefault();
      const currentIndex = index;
      const anchorId = lastSelectedTaskId || sortedAndFilteredTasks[0]?.id;
      const lastIndex = sortedAndFilteredTasks.findIndex((t) => t.id === anchorId);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const newSelection = new Set<string>();
        for (let i = start; i <= end; i++) {
          newSelection.add(sortedAndFilteredTasks[i].id);
        }
        setSelectedTaskIds(newSelection);
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const newSelection = new Set(selectedTaskIds);
      if (newSelection.has(taskId)) {
        newSelection.delete(taskId);
      } else {
        newSelection.add(taskId);
      }
      setSelectedTaskIds(newSelection);
    } else {
      setSelectedTaskIds(new Set([taskId]));
    }
    setLastSelectedTaskId(taskId);
  };

  const handleDeleteAll = async () => {
    if (selectedTaskIds.size > 0) {
      if (await confirm(`Are you sure you want to delete ${selectedTaskIds.size} selected task(s)?`, { title: `Delete ${selectedTaskIds.size} Tasks`, confirmText: "Delete", variant: "destructive" })) {
        execBulkDelete({ ids: Array.from(selectedTaskIds) });
        setSelectedTaskIds(new Set());
      }
    } else {
      if (sortedAndFilteredTasks.length > 0 && await confirm("Are you sure you want to permanently delete ALL tasks shown?", { title: "Delete All Tasks", confirmText: "Delete", variant: "destructive" })) {
        execBulkDelete({ ids: sortedAndFilteredTasks.map((t) => t.id) });
      }
    }
  };

  const isSubmitting = createStatus === "executing" || updateStatus === "executing";

  // ── SUBCOMPONENTS ─────────────────────────────────────────────────────────
  const renderSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) return null;
    return (
      <span className="text-muted-foreground">
        {sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-2 px-2 text-xl font-semibold text-foreground">
        <ListTodo className="w-6 h-6 text-primary" />
        Tasks
      </div>
      <PageLayout className="rounded-xl border shadow-sm relative select-none">
      <Toolbar
        search={
          <div className="flex items-center gap-2">
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
              {[
                { value: "ALL", label: t("all") },
                { value: "PENDING", label: t("pending") },
                { value: "IN_PROGRESS", label: t("inProgress") },
                { value: "COMPLETED", label: t("completed") },
              ].map((filter) => {
                const isActive = statusFilter === filter.value;
                return (
                  <Button
                    key={filter.value}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter(filter.value)}
                    className={cn(
                      "whitespace-nowrap flex items-center",
                      isActive
                        ? "bg-background text-foreground shadow-sm hover:bg-background"
                        : "text-muted-foreground"
                    )}
                  >
                    {filter.label}
                  </Button>
                );
              })}
            </div>
          </div>
        }
        actions={
          <>
            <Button
              variant="destructive-outline"
              size="sm"
              onClick={handleDeleteAll}
              disabled={sortedAndFilteredTasks.length === 0}
              title={selectedTaskIds.size > 0 ? `Delete ${selectedTaskIds.size} selected` : "Delete All Tasks"}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selectedTaskIds.size > 0 ? `Delete (${selectedTaskIds.size})` : "Delete All"}
              </span>
            </Button>
            <Button
              size="sm"
              onClick={() => setModalState({ isOpen: true, task: null })}
              disabled={createStatus === "executing"}
            >
              {createStatus === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              <span className="hidden sm:inline">{t("createTask")}</span>
            </Button>
          </>
        }
      />

      {/* ── FILE EXPLORER (TABLE VIEW) ──────────────────────────────────── */}
      <TableContainer
        onClick={() => {
          setSelectedTaskIds(new Set());
          setLastSelectedTaskId(null);
        }}
      >
        <Table>
          <TableHeader onClick={(e) => e.stopPropagation()}>
            <TableRow>
              <TableHead 
                className="w-full min-w-[200px] cursor-pointer select-none group"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center gap-2">
                  Task Name
                  {renderSortIcon("title")}
                </div>
              </TableHead>
              <TableHead 
                className="w-[160px] min-w-[160px] hidden md:table-cell cursor-pointer group"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center gap-2">
                  Created
                  {renderSortIcon("createdAt")}
                </div>
              </TableHead>
              <TableHead 
                className="w-[160px] min-w-[160px] cursor-pointer select-none group"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-2">
                  Status
                  {renderSortIcon("status")}
                </div>
              </TableHead>
              <TableHead className="w-[120px] min-w-[120px] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredTasks.length === 0 ? (
              <TableRow className="hover:bg-transparent cursor-default">
                <TableCell colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  {t("noTasks")}
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredTasks.map((task, index) => {
                const isCompleted = task.status === "COMPLETED";
                return (
                  <TableRow
                    key={task.id}
                    className={cn(
                      "group transition-colors border-b border-border/50 border-l-2 cursor-pointer",
                      selectedTaskIds.has(task.id)
                        ? "bg-primary/5 border-l-primary"
                        : "hover:bg-muted/50 border-l-transparent"
                    )}
                    onClick={(e) => handleRowClick(e, task.id, index)}
                  >
                    <TableCell className="font-medium text-foreground w-full max-w-[0px]">
                      <div 
                        className="w-full cursor-pointer" 
                        onClick={(e) => toggleExpand(e, task.id)}
                        title={t("toggleExpand")}
                      >
                        <div 
                          className={cn(
                            "whitespace-normal",
                            !expandedTasks.has(task.id) && "line-clamp-1"
                          )}
                          style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                        >
                          <span className={isCompleted ? "line-through text-muted-foreground" : ""}>
                            {task.title}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground hidden sm:table-cell">
                      {formatDate(task.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={(e) => toggleTaskCompletion(e, task)}
                          style={{ width: '130px' }}
                          className={`text-[10px] font-bold py-1.5 px-3 rounded-full shrink-0 inline-flex items-center justify-center text-center whitespace-nowrap hover:opacity-80 transition-opacity ${STATUS_STYLES[task.status]}`}
                        >
                          {task.status.replace("_", " ")}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center justify-start gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <ActionButton
                          actionType="edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalState({ isOpen: true, task });
                          }}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </ActionButton>
                        <ActionButton
                          actionType="delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            execDelete({ id: task.id });
                          }}
                          disabled={deleteStatus === "executing"}
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

      {/* CREATE / EDIT DIALOG */}
      <Dialog
        open={modalState.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setModalState({ isOpen: false, task: null });
          }
        }}
      >
        <DialogContent aria-describedby={undefined} className="sm:max-w-2xl bg-background border-border p-6 sm:p-8 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight">{modalState.task ? "Edit Task" : t("createTask")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 flex flex-col mt-4"
          >
            <div className="space-y-4">
              <Input
                {...form.register("title")}
                className="h-auto rounded-xl border-transparent bg-muted/30 px-4 py-4 text-base font-medium shadow-sm focus-visible:border-primary/30 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10"
                placeholder="Enter a task name..."
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end mt-6 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalState({ isOpen: false, task: null })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </PageLayout>
    </div>
  );
}
