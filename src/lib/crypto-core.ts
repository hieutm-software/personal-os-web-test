/**
 * crypto-core.ts — Shared WebCrypto primitives (browser + Web Worker compatible)
 *
 * This file intentionally avoids any `window` / `document` references so it
 * can be safely imported by:
 *   - crypto-client.ts  (main thread)
 *   - crypto.worker.ts  (Web Worker context, which has no `window`)
 *
 * Previously, the worker file contained a full copy of `deriveKey` and
 * `decryptClient`. That duplication has been eliminated by this shared module.
 */

/**
 * Converts a hex string to a Uint8Array.
 * Used internally by deriveKey, encryptCore, and decryptCore.
 */
export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) throw new Error("Invalid hex string");
  // Pre-allocate with a concrete ArrayBuffer (not ArrayBufferLike) so the result
  // is compatible with WebCrypto's BufferSource / Pbkdf2Params.salt type.
  const bytes = new Uint8Array(matches.length);
  matches.forEach((byte, i) => { bytes[i] = parseInt(byte, 16); });
  return bytes;
}

/**
 * Converts a Uint8Array to a lowercase hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Derives an AES-GCM-256 CryptoKey from a master password and a hex salt
 * using PBKDF2 with SHA-256 (100,000 iterations).
 */
export async function deriveKeyCore(masterPassword: string, saltHex: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const saltBytes = hexToBytes(saltHex);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Decrypts a string previously encrypted with `encryptCore`.
 * Format expected: "v2:<saltHex>:<ivHex>:<cipherHex>"
 */
export async function decryptCore(encryptedStr: string, masterPassword: string): Promise<string> {
  const parts = encryptedStr.split(":");
  if (parts.length !== 4 || parts[0] !== "v2") {
    throw new Error("Invalid E2EE format");
  }
  const [, saltHex, ivHex, cipherHex] = parts;

  const key = await deriveKeyCore(masterPassword, saltHex);
  const iv = hexToBytes(ivHex);
  const cipherBytes = hexToBytes(cipherHex);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBytes
  );
  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Encrypts a plaintext string using AES-GCM-256 + PBKDF2.
 * Returns the format: "v2:<saltHex>:<ivHex>:<cipherHex>"
 */
export async function encryptCore(text: string, masterPassword: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bytesToHex(saltBytes);

  const key = await deriveKeyCore(masterPassword, saltHex);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  const ivHex = bytesToHex(iv);
  const cipherHex = bytesToHex(new Uint8Array(ciphertext));

  return `v2:${saltHex}:${ivHex}:${cipherHex}`;
}
