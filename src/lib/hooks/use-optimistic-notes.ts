"use client";

import { Note } from "@/lib/db/schema";
import { useOptimistic, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export type OptimisticNoteAction =
  | { type: "add"; note: Note }
  | { type: "update"; id: string; patch: Partial<Note> }
  | { type: "softDelete"; id: string }
  | { type: "restore"; id: string }
  | { type: "hardDelete"; id: string }
  | { type: "bulkSoftDelete"; ids: string[] }
  | { type: "bulkRestore"; ids: string[] }
  | { type: "bulkHardDelete"; ids: string[] }
  | { type: "softDeleteAll" }
  | { type: "restoreAll" }
  | { type: "emptyTrash" };

function optimisticReducer(state: Note[], action: OptimisticNoteAction): Note[] {
  const now = new Date().toISOString();
  switch (action.type) {
    case "add":
      return [action.note, ...state];
    case "update":
      return state.map((n) => (n.id === action.id ? { ...n, ...action.patch } : n));
    case "softDelete":
      return state.map((n) => (n.id === action.id ? { ...n, deletedAt: now } : n));
    case "restore":
      return state.map((n) => (n.id === action.id ? { ...n, deletedAt: null } : n));
    case "hardDelete":
      return state.filter((n) => n.id !== action.id);
    case "bulkSoftDelete":
      return state.map((n) => (action.ids.includes(n.id) ? { ...n, deletedAt: now } : n));
    case "bulkRestore":
      return state.map((n) => (action.ids.includes(n.id) ? { ...n, deletedAt: null } : n));
    case "bulkHardDelete":
      return state.filter((n) => !action.ids.includes(n.id));
    case "softDeleteAll":
      return state.map((n) => (!n.deletedAt ? { ...n, deletedAt: now } : n));
    case "restoreAll":
      return state.map((n) => ({ ...n, deletedAt: null }));
    case "emptyTrash":
      return state.filter((n) => !n.deletedAt);
    default:
      return state;
  }
}

export function useOptimisticNotes(serverNotes: Note[]) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticNotes, dispatchOptimistic] = useOptimistic(
    serverNotes,
    optimisticReducer
  );

  const mutate = useCallback(
    <TResult extends { failure?: string; success?: unknown }>(
      optimisticAction: OptimisticNoteAction,
      serverAction: () => Promise<TResult | undefined>,
      options?: { skipRefresh?: boolean }
    ) => {
      startTransition(async () => {
        dispatchOptimistic(optimisticAction);
        try {
          const result = await serverAction();
          if (result?.failure) {
            toast(result.failure, "error");
          } else if (!options?.skipRefresh) {
            router.refresh();
          }
        } catch {
          toast("An unexpected error occurred. Changes have been reverted.", "error");
        }
      });
    },
    [dispatchOptimistic, toast, startTransition, router]
  );

  return { optimisticNotes, mutate, isPending };
}
