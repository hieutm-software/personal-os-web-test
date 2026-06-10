import { useEffect, useRef, useCallback } from "react";

export function usePendingSync<T extends { id?: string }>(syncFn: (data: T) => void, delayMs = 2000) {
  const pendingUpdates = useRef<Map<string, Partial<T>>>(new Map());
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(() => {
    if (pendingUpdates.current.size > 0) {
      pendingUpdates.current.forEach((dataToSync, syncId) => {
        syncFn({ id: syncId, ...dataToSync } as T);
      });
      pendingUpdates.current.clear();
    }
  }, [syncFn]);

  const queueUpdate = useCallback((id: string, data: Partial<T>) => {
    const current = pendingUpdates.current.get(id) || {};
    pendingUpdates.current.set(id, { ...current, ...data });
    
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      flush();
    }, delayMs);
  }, [flush, delayMs]);

  useEffect(() => {
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [flush]);

  return { queueUpdate, flush, pendingUpdates };
}
