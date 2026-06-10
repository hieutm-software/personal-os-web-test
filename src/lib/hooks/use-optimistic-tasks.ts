"use client";

import { Task } from "@/lib/db/schema";
import { useOptimistic, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticTasks, dispatchOptimistic] = useOptimistic(
    serverTasks,
    optimisticReducer
  );

  /**
   * Wraps optimistic dispatch + server action inside a single async
   * startTransition so useOptimistic keeps the optimistic state visible
   * for the entire round-trip (React 19 async transitions).
   */
  const mutate = useCallback(
    <TResult extends { failure?: string; success?: unknown }>(
      optimisticAction: OptimisticAction,
      serverAction: () => Promise<TResult | undefined>,
    ) => {
      startTransition(async () => {
        dispatchOptimistic(optimisticAction);
        try {
          const result = await serverAction();
          if (result?.failure) {
            toast(result.failure, "error");
          } else {
            // router.refresh() inside the transition keeps useOptimistic showing
            // the optimistic state until the RSC server component re-renders
            // with the new DB data from revalidatePath.
            router.refresh();
          }
        } catch {
          toast("An unexpected error occurred. Changes have been reverted.", "error");
        }
      });
    },
    [dispatchOptimistic, toast, startTransition, router]
  );

  return { optimisticTasks, mutate, isPending };
}
