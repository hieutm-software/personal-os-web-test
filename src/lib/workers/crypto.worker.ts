// crypto.worker.ts
// Worker for offloading heavy crypto operations (like bulk decryption for E2EE exports)

self.addEventListener("message", async (e: MessageEvent) => {
  const { type, payload, masterPassword } = e.data;

  if (type === "BULK_DECRYPT") {
    try {
      const { items } = payload;
      
      const decryptedItems = [];
      for (const item of items) {
        if (item.password?.startsWith("v2:")) {
          try {
            const pwd = await decryptClient(item.password, masterPassword);
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
      self.postMessage({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
});

// Duplicated Crypto Logic here because Workers run in a separate context
// and standard imports can be tricky depending on the bundler setup.
async function deriveKey(masterPassword: string, saltHex: string): Promise<CryptoKey> {
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

async function decryptClient(encryptedStr: string, masterPassword: string): Promise<string> {
  const parts = encryptedStr.split(':');
  if (parts.length !== 4 || parts[0] !== 'v2') throw new Error("Invalid format");
  const [, saltHex, ivHex, cipherHex] = parts;

  const key = await deriveKey(masterPassword, saltHex);
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, cipherBytes);
  return new TextDecoder().decode(decryptedBuffer);
}
