"use client";

import { Task } from "@/lib/db/schema";
import { useOptimisticList } from "./use-optimistic-list";

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

/**
 * Optimistic state manager for the Tasks list.
 * Built on top of the generic `useOptimisticList` hook.
 */
export function useOptimisticTasks(serverTasks: Task[]) {
  const { optimisticItems, mutate, isPending } = useOptimisticList(
    serverTasks,
    optimisticReducer
  );

  return { optimisticTasks: optimisticItems, mutate, isPending };
}
