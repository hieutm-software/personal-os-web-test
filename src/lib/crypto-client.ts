/**
 * Client-side WebCrypto API for Zero-Knowledge Vault Encryption
 */

// Generate a random salt
export function generateSalt(): string {
  if (typeof window !== "undefined" && !window.crypto) {
    throw new Error("WebCrypto API is not available.");
  }
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Derive AES-GCM Key from Master Password + Salt using PBKDF2
export async function deriveKey(masterPassword: string, saltHex: string): Promise<CryptoKey> {
  if (typeof window !== "undefined" && !window.crypto?.subtle) {
    throw new Error("WebCrypto API is not available. E2EE Vault requires a secure context (HTTPS or localhost).");
  }

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt data returning format: "v2:salt:iv:ciphertext"
export async function encryptClient(text: string, masterPassword: string): Promise<string> {
  const salt = generateSalt();
  const key = await deriveKey(masterPassword, salt);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encoded = enc.encode(text);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoded
  );

  const ivHex = Array.from(iv, byte => byte.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(new Uint8Array(ciphertext), byte => byte.toString(16).padStart(2, '0')).join('');

  return `v2:${salt}:${ivHex}:${cipherHex}`;
}

// Decrypt data from format: "v2:salt:iv:ciphertext"
export async function decryptClient(encryptedStr: string, masterPassword: string): Promise<string> {
  try {
    const parts = encryptedStr.split(':');
    if (parts.length !== 4 || parts[0] !== 'v2') {
      throw new Error("Invalid E2EE format");
    }

    const [, saltHex, ivHex, cipherHex] = parts;

    const key = await deriveKey(masterPassword, saltHex);
    
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      cipherBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (e: unknown) {
    console.error("Client decryption failed", e);
    if (e instanceof Error && e.message?.includes("WebCrypto API is not available")) {
      throw e;
    }
    throw new Error("Client decryption failed. Wrong Master Password?");
  }
}
