"use client";

import { useOptimistic, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC OPTIMISTIC LIST HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic hook for optimistic list mutations with React 19 async transitions.
 *
 * Centralises the identical boilerplate that existed across:
 *   - use-optimistic-tasks.ts
 *   - use-optimistic-events.ts
 *
 * The pattern: dispatchOptimistic → serverAction → router.refresh() on success,
 * or toast(error) on failure, is identical in both. Only the reducer and type
 * parameters differ, which are now injected.
 *
 * Usage:
 *   const { items, mutate, isPending } = useOptimisticList(
 *     serverTasks,
 *     taskReducer
 *   );
 */
export function useOptimisticList<TItem, TAction>(
  serverItems: TItem[],
  reducer: (state: TItem[], action: TAction) => TItem[],
  options?: {
    /** If true, router.refresh() is skipped after a successful mutation. */
    skipRefreshOnSuccess?: boolean;
  }
) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticItems, dispatchOptimistic] = useOptimistic(
    serverItems,
    reducer
  );

  /**
   * Wraps optimistic dispatch + server action inside a single async
   * startTransition so useOptimistic keeps the optimistic state visible
   * for the entire round-trip (React 19 async transitions).
   */
  const mutate = useCallback(
    <TResult extends { failure?: string; success?: unknown }>(
      optimisticAction: TAction,
      serverAction: () => Promise<TResult | undefined>,
      mutateOptions?: { skipRefresh?: boolean }
    ) => {
      startTransition(async () => {
        dispatchOptimistic(optimisticAction);
        try {
          const result = await serverAction();
          if (result?.failure) {
            toast(result.failure, "error");
          } else if (!options?.skipRefreshOnSuccess && !mutateOptions?.skipRefresh) {
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
    [dispatchOptimistic, toast, startTransition, router, options]
  );

  return { optimisticItems, mutate, isPending };
}
