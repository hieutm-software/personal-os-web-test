import { defaultCache } from "@serwist/next/worker";
// @ts-expect-error - Serwist type mismatch
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
// @ts-expect-error - Serwist type mismatch
import { Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that points to where the precache manifest should be injected.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
