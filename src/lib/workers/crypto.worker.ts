/**
 * crypto.worker.ts
 *
 * Web Worker that offloads heavy crypto operations (e.g. bulk E2EE decryption
 * for vault export) off the main UI thread to keep the 60FPS target.
 *
 * Previously this file contained a full duplicate of `deriveKey` and
 * `decryptClient` (tracked as tech debt with a comment). That duplication has
 * been resolved: crypto primitives now live in `crypto-core.ts`, which is
 * compatible with both the main thread and Worker scope (no `window` refs).
 *
 * NOTE: Bundler configuration must mark this file as a Worker entry-point so
 * that its transitive imports (crypto-core.ts) are included in the worker
 * bundle. With Next.js + webpack 5 this is achieved by instantiating via:
 *   new Worker(new URL("../lib/workers/crypto.worker.ts", import.meta.url))
 */

import { decryptCore } from "../crypto-core";

self.addEventListener("message", async (e: MessageEvent) => {
  const { type, payload, masterPassword } = e.data;

  if (type === "BULK_DECRYPT") {
    try {
      const { items } = payload;

      const decryptedItems = [];
      for (const item of items) {
        if (item.password?.startsWith("v2:")) {
          try {
            const pwd = await decryptCore(item.password, masterPassword);
            decryptedItems.push({ ...item, password: pwd });
          } catch {
            decryptedItems.push({ ...item, password: "ERROR_DECRYPTING" });
          }
        } else {
          decryptedItems.push(item);
        }
      }

      self.postMessage({ success: true, data: decryptedItems });
    } catch (error: unknown) {
      self.postMessage({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
});
