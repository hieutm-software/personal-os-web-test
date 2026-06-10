"use client";

import { Task } from "@/lib/db/schema";
import { useOptimistic, useCallback, startTransition } from "react";
import { useToast } from "@/components/ui/toast";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type OptimisticAction =
  | { type: "add"; task: Task }
  | { type: "update"; id: string; patch: Partial<Task> }
  | { type: "delete"; id: string }
  | { type: "bulkDelete"; ids: string[] };

// ─────────────────────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────────────────────

function optimisticReducer(state: Task[], action: OptimisticAction): Task[] {
  switch (action.type) {
    case "add":
      return [action.task, ...state];
    case "update":
      return state.map((t) =>
        t.id === action.id ? { ...t, ...action.patch } : t
      );
    case "delete":
      return state.filter((t) => t.id !== action.id);
    case "bulkDelete":
      return state.filter((t) => !action.ids.includes(t.id));
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useOptimisticTasks(serverTasks: Task[]) {
  const { toast } = useToast();

  const [optimisticTasks, dispatchOptimistic] = useOptimistic(
    serverTasks,
    optimisticReducer
  );

  /**
   * Dispatches an optimistic update immediately, then runs the async server
   * action. If the action returns a `failure`, rolls back by re-dispatching
   * the inverse and shows an error toast.
   */
  const mutate = useCallback(
    async <TResult extends { failure?: string; success?: unknown }>(
      optimisticAction: OptimisticAction,
      serverAction: () => Promise<TResult | undefined>,
      rollbackAction?: OptimisticAction
    ) => {
      // 1. Instant optimistic update (0ms)
      startTransition(() => {
        dispatchOptimistic(optimisticAction);
      });

      // 2. Background server action
      try {
        const result = await serverAction();
        if (result?.failure) {
          // 3a. Rollback: useOptimistic auto-reverts when React re-renders
          //    with the unchanged server state. We also show a toast.
          toast(result.failure, "error");
        }
      } catch {
        toast("An unexpected error occurred. Changes have been reverted.", "error");
      }
    },
    [dispatchOptimistic, toast]
  );

  return { optimisticTasks, mutate };
}
