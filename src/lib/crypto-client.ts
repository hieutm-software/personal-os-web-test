/**
 * crypto-client.ts — Client-side WebCrypto API for Zero-Knowledge Vault Encryption
 *
 * Thin wrapper over crypto-core.ts that adds browser guards (window.crypto checks)
 * and re-exports the public API surface consumed by vault UI components.
 *
 * The raw primitives live in crypto-core.ts so the Web Worker can import them
 * without duplicating code.
 */

import { deriveKeyCore, encryptCore, decryptCore } from "./crypto-core";

// Re-export core functions under their existing public names so no consumer
// needs to change its imports.
export { deriveKeyCore as deriveKey };

// ---------------------------------------------------------------------------
// BROWSER GUARD
// ---------------------------------------------------------------------------

function assertWebCrypto(): void {
  if (typeof window !== "undefined" && !window.crypto?.subtle) {
    throw new Error(
      "WebCrypto API is not available. E2EE Vault requires a secure context (HTTPS or localhost)."
    );
  }
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/** Generates a random 16-byte hex salt (for internal use or testing). */
export function generateSalt(): string {
  assertWebCrypto();
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Encrypts `text` with the given master password.
 * Returns "v2:<saltHex>:<ivHex>:<cipherHex>".
 */
export async function encryptClient(text: string, masterPassword: string): Promise<string> {
  assertWebCrypto();
  return encryptCore(text, masterPassword);
}

/**
 * Decrypts a string previously encrypted with `encryptClient`.
 */
export async function decryptClient(encryptedStr: string, masterPassword: string): Promise<string> {
  assertWebCrypto();
  try {
    return await decryptCore(encryptedStr, masterPassword);
  } catch (e: unknown) {
    console.error("Client decryption failed", e);
    if (e instanceof Error && e.message?.includes("WebCrypto API is not available")) {
      throw e;
    }
    throw new Error("Client decryption failed. Wrong Master Password?");
  }
}
