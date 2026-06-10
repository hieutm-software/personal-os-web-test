import { createSafeActionClient } from "next-safe-action";

/**
 * Shared safe-action client singleton used by all Server Action files.
 *
 * Previously, each action file called `createSafeActionClient()` independently
 * (8 separate instances). Centralising here means any future middleware
 * (rate limiting, logging, error tracking) only needs to be added once.
 *
 * Usage:
 *   import { actionClient } from "@/lib/actions/client";
 */
export const actionClient = createSafeActionClient();
