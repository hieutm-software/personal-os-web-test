"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  bulkDeleteTasksAction,
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/lib/actions/tasks";
import { Task } from "@/lib/db/schema";
import { generateUUID, formatDate } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckSquare,
  ListTodo,
  Loader2,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDialogs } from "@/components/providers/dialog-provider";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SortIcon } from "@/components/ui/sort-icon";
import { TabSwitcher } from "@/components/ui/tab-switcher";
import { usePendingSync } from "@/lib/hooks/use-pending-sync";
import { useRowSelection } from "@/lib/hooks/use-row-selection";
import { PageLayout } from "@/components/ui/page-layout";
import { Toolbar } from "@/components/ui/toolbar";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

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

  const [localTasks, setLocalTasks] = useState<Task[]>(initialTasks);
  useEffect(() => setLocalTasks(initialTasks), [initialTasks]);

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

  // ── DEBOUNCED SYNC QUEUE ──────────────────────────────────────────────────
  const { queueUpdate } = usePendingSync<Task>(execUpdate);

  // ── DERIVED STATE ─────────────────────────────────────────────────────────
  const sortedAndFilteredTasks = useMemo(() => {
    const filtered = localTasks.filter((task) =>
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
  }, [localTasks, statusFilter, sortConfig]);

  const { selectedIds: selectedTaskIds, setSelectedIds: setSelectedTaskIds, handleRowClick, clearSelection } = useRowSelection(sortedAndFilteredTasks);

  // ── VIRTUALIZATION ────────────────────────────────────────────────────────
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: sortedAndFilteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, // Approx height of a row
    overscan: 10,
  });

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
    }, 0);
  }, [sortedAndFilteredTasks, setSelectedTaskIds]);

  const handleDeleteAll = async () => {
    if (selectedTaskIds.size > 0) {
      if (await confirm(`Are you sure you want to delete ${selectedTaskIds.size} selected task(s)?`, { title: `Delete ${selectedTaskIds.size} Tasks`, confirmText: "Delete", variant: "destructive" })) {
        const idsArray = Array.from(selectedTaskIds);
        setLocalTasks(prev => prev.filter(t => !selectedTaskIds.has(t.id)));
        execBulkDelete({ ids: idsArray });
        setSelectedTaskIds(new Set());
      }
    } else {
      if (sortedAndFilteredTasks.length > 0 && await confirm("Are you sure you want to permanently delete ALL tasks shown?", { title: "Delete All Tasks", confirmText: "Delete", variant: "destructive" })) {
        const idsArray = sortedAndFilteredTasks.map((t) => t.id);
        setLocalTasks(prev => prev.filter(t => !idsArray.includes(t.id)));
        execBulkDelete({ ids: idsArray });
      }
    }
  };

  const isSubmitting = createStatus === "executing" || updateStatus === "executing";

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleTaskCompletion = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const nextStatus = NEXT_STATUS_MAP[task.status];
    setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    queueUpdate(task.id, { status: nextStatus });
  };

  const onSubmit = (data: TaskFormValues) => {
    if (modalState.task) {
      setLocalTasks(prev => prev.map(t => t.id === modalState.task!.id ? { ...t, title: data.title, status: data.status || t.status } : t));
      queueUpdate(modalState.task.id, { title: data.title });
    } else {
      const newId = generateUUID();
      setLocalTasks(prev => [{
        id: newId,
        title: data.title,
        status: data.status || "PENDING",
        userId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Task, ...prev]);
      execCreate({
        id: newId,
        title: data.title,
      });
    }
    setModalState({ isOpen: false, task: null });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-2 px-2 text-xl font-semibold text-foreground">
        <ListTodo className="w-6 h-6 text-primary" />
        Tasks
      </div>
      <PageLayout className="relative select-none border-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-primary/5 via-transparent to-transparent pointer-events-none z-0" />
        <div className="relative z-10 h-full flex flex-col">
      <Toolbar
        search={
          <TabSwitcher
            tabs={[
              { value: "ALL", label: t("all") },
              { value: "PENDING", label: t("pending") },
              { value: "IN_PROGRESS", label: t("inProgress") },
              { value: "COMPLETED", label: t("completed") },
            ]}
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val)}
          />
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
        ref={parentRef}
        onClick={() => clearSelection()}
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
                  <SortIcon active={sortConfig.key === "title"} direction={sortConfig.direction} />
                </div>
              </TableHead>
              <TableHead 
                className="w-[160px] min-w-[160px] hidden md:table-cell cursor-pointer group"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center gap-2">
                  Created
                  <SortIcon active={sortConfig.key === "createdAt"} direction={sortConfig.direction} />
                </div>
              </TableHead>
              <TableHead 
                className="w-[160px] min-w-[160px] cursor-pointer select-none group"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-2">
                  Status
                  <SortIcon active={sortConfig.key === "status"} direction={sortConfig.direction} />
                </div>
              </TableHead>
              <TableHead className="w-[120px] min-w-[120px] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredTasks.length === 0 ? (
              <TableRow className="hover:bg-transparent cursor-default">
                <TableCell colSpan={4} className="p-0">
                  <EmptyState 
                    icon={CheckSquare}
                    title={t("noTasks")}
                    description={statusFilter !== "ALL" ? "No tasks match your filters." : "You have no tasks yet."}
                  />
                </TableCell>
              </TableRow>
            ) : (
              <>
                {rowVirtualizer.getVirtualItems().length > 0 && rowVirtualizer.getVirtualItems()[0].start > 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px`, padding: 0, border: 0 }} />
                  </TableRow>
                )}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const task = sortedAndFilteredTasks[virtualRow.index];
                  const isCompleted = task.status === "COMPLETED";
                  return (
                    <TableRow
                      key={virtualRow.key}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      className={cn(
                        "group transition-colors border-b border-border/50 border-l-2 cursor-pointer",
                        selectedTaskIds.has(task.id)
                          ? "bg-primary/5 border-l-primary"
                          : "hover:bg-muted/50 border-l-transparent"
                      )}
                      onClick={(e) => handleRowClick(e, task.id, virtualRow.index)}
                    >
                      <TableCell className="font-medium text-foreground w-full max-w-[0px] h-full align-middle">
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
                              setLocalTasks(prev => prev.filter(t => t.id !== task.id));
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
                })}
                {rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0) > 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} style={{ height: `${rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0)}px`, padding: 0, border: 0 }} />
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CREATE / EDIT DIALOG */}
      <FormDialog
        isOpen={modalState.isOpen}
        onOpenChange={(isOpen) => !isOpen && setModalState({ isOpen: false, task: null })}
        title={modalState.task ? "Edit Task" : t("createTask")}
        onSubmit={form.handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
        submitText="Save"
      >
        <Input
          variant="form"
          {...form.register("title")}
          placeholder="Enter a task name..."
          autoFocus
        />
      </FormDialog>
      </div>
      </PageLayout>
    </div>
  );
}
