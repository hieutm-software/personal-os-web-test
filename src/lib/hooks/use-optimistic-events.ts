"use client";

import { Event } from "@/lib/db/schema";
import { useOptimistic, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export type OptimisticEventAction =
  | { type: "add"; event: Event }
  | { type: "update"; id: string; patch: Partial<Event> }
  | { type: "delete"; id: string }
  | { type: "bulkDelete"; ids: string[] };

function optimisticReducer(state: Event[], action: OptimisticEventAction): Event[] {
  switch (action.type) {
    case "add":
      return [action.event, ...state];
    case "update":
      return state.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e));
    case "delete":
      return state.filter((e) => e.id !== action.id);
    case "bulkDelete":
      return state.filter((e) => !action.ids.includes(e.id));
    default:
      return state;
  }
}

export function useOptimisticEvents(serverEvents: Event[]) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticEvents, dispatchOptimistic] = useOptimistic(
    serverEvents,
    optimisticReducer
  );

  const mutate = useCallback(
    <TResult extends { failure?: string; success?: unknown }>(
      optimisticAction: OptimisticEventAction,
      serverAction: () => Promise<TResult | undefined>
    ) => {
      startTransition(async () => {
        dispatchOptimistic(optimisticAction);
        try {
          const result = await serverAction();
          if (result?.failure) {
            toast(result.failure, "error");
          } else {
            router.refresh();
          }
        } catch {
          toast("An unexpected error occurred. Changes have been reverted.", "error");
        }
      });
    },
    [dispatchOptimistic, toast, startTransition, router]
  );

  return { optimisticEvents, mutate, isPending };
}
