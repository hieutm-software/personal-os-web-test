"use client";

import { useState, useCallback } from "react";

/**
 * Reusable hook for multi-row selection with Shift+click and Ctrl/Cmd+click support.
 * Replaces copy-pasted selection logic across tasks, vault, notes, and documents clients.
 */
export function useRowSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const handleRowClick = useCallback(
    (e: React.MouseEvent, id: string, index: number) => {
      e.stopPropagation();

      if (e.shiftKey) {
        e.preventDefault();
        const anchorId = lastSelectedId ?? items[0]?.id;
        const lastIndex = items.findIndex((item) => item.id === anchorId);

        if (index !== -1 && lastIndex !== -1) {
          const start = Math.min(index, lastIndex);
          const end = Math.max(index, lastIndex);
          const next = new Set<string>();
          for (let i = start; i <= end; i++) {
            next.add(items[i].id);
          }
          setSelectedIds(next);
        }
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
      } else {
        setSelectedIds(new Set([id]));
      }
      setLastSelectedId(id);
    },
    [items, lastSelectedId]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  return {
    selectedIds,
    lastSelectedId,
    setSelectedIds,
    handleRowClick,
    clearSelection,
  };
}
