"use client";

import { Event } from "@/lib/db/schema";
import { useOptimisticList } from "./use-optimistic-list";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type OptimisticEventAction =
  | { type: "add"; event: Event }
  | { type: "update"; id: string; patch: Partial<Event> }
  | { type: "delete"; id: string }
  | { type: "bulkDelete"; ids: string[] };

// ─────────────────────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Optimistic state manager for the Events list.
 * Built on top of the generic `useOptimisticList` hook.
 */
export function useOptimisticEvents(serverEvents: Event[]) {
  const { optimisticItems, mutate, isPending } = useOptimisticList(
    serverEvents,
    optimisticReducer
  );

  return { optimisticEvents: optimisticItems, mutate, isPending };
}
