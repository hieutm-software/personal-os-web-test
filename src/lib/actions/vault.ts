"use server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vault } from "@/lib/db/schema";
import { z } from "zod";
import crypto from "crypto";
import { eq, and, inArray } from "drizzle-orm";
import { checkNeonQuota } from "./quota";
import { actionClient } from "./client";


function getEncryptionKey() {
  if (process.env.VAULT_ENCRYPTION_KEY) {
    if (process.env.VAULT_ENCRYPTION_KEY.length === 64) {
      return Buffer.from(process.env.VAULT_ENCRYPTION_KEY, "hex");
    }
    return crypto.createHash("sha256").update(process.env.VAULT_ENCRYPTION_KEY).digest();
  }
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  return crypto.createHash("sha256").update(process.env.JWT_SECRET + "vault_fallback_salt_v1").digest();
}

function encryptPassword(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decryptPassword(encryptedStr: string): string {
  try {
    const [ivHex, authTagHex, encryptedHex] = encryptedStr.split(":");
    if (!ivHex || !authTagHex || !encryptedHex) throw new Error("Invalid format");
    
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    console.error("Decryption failed:", e);
    return "Error: Decryption Failed";
  }
}

export const createVaultItemAction = actionClient
  .schema(z.object({
    id: z.string().uuid().optional(),
    platform: z.string().trim().min(1, "Platform is required").max(200, "Platform name too long"),
    username: z.string().trim().min(1, "Username is required").max(200, "Username too long"),
    password: z.string().min(1, "Password is required").max(10_000, "Password too long"),
    note: z.string().trim().max(5_000, "Note too long").optional(),
  }))
  .action(async ({ parsedInput: { id, platform, username, password, note } }) => {
    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    const approxBytes = platform.length + username.length + password.length + (note?.length || 0);
    if (approxBytes > 0) {
      const hasQuota = await checkNeonQuota(session.userId, approxBytes);
      if (!hasQuota) {
        return { failure: "NeonDB storage limit of 150MB exceeded. Please delete some items." };
      }
    }

    const passwordEncrypted = password.startsWith("v2:") ? password : encryptPassword(password);

    await db.insert(vault).values({
      id: id || crypto.randomUUID(),
      userId: session.userId,
      platform,
      username,
      passwordEncrypted,
      note,
    });

    return { success: true };
  });

export const deleteVaultItemAction = actionClient
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput: { id } }) => {
    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    await db.delete(vault).where(and(eq(vault.id, id), eq(vault.userId, session.userId)));
    return { success: true };
  });

export const updateVaultItemAction = actionClient
  .schema(z.object({
    id: z.string().uuid(),
    platform: z.string().trim().min(1).max(200, "Platform name too long").optional(),
    username: z.string().trim().min(1).max(200, "Username too long").optional(),
    password: z.string().max(10_000, "Password too long").optional(),
    note: z.string().trim().max(5_000, "Note too long").optional().nullable(),
  }))
  .action(async ({ parsedInput: { id, platform, username, password, note } }) => {
    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    const approxBytes = (platform?.length || 0) + (username?.length || 0) + (password?.length || 0) + (note?.length || 0);
    if (approxBytes > 0) {
      const hasQuota = await checkNeonQuota(session.userId, approxBytes);
      if (!hasQuota) {
        return { failure: "NeonDB storage limit of 150MB exceeded. Please delete some items." };
      }
    }

    const updateData: Record<string, string | null> = {
      updatedAt: new Date().toISOString(),
    };
    
    if (platform !== undefined) updateData.platform = platform;
    if (username !== undefined) updateData.username = username;
    if (note !== undefined) updateData.note = note ?? null;
    
    if (password) {
      updateData.passwordEncrypted = password.startsWith("v2:") ? password : encryptPassword(password);
    }

    await db
      .update(vault)
      .set(updateData)
      .where(and(eq(vault.id, id), eq(vault.userId, session.userId)));

    return { success: true };
  });

export const getDecryptedPasswordAction = actionClient
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput: { id } }) => {
    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    const [item] = await db.select().from(vault).where(and(eq(vault.id, id), eq(vault.userId, session.userId))).limit(1);
    if (!item) return { failure: "Not found" };

    const password = item.passwordEncrypted.startsWith("v2:") 
      ? item.passwordEncrypted 
      : decryptPassword(item.passwordEncrypted);
    return { success: true, password, isE2EE: item.passwordEncrypted.startsWith("v2:") };
  });

export const bulkDeleteVaultItemsAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    await db.delete(vault).where(and(inArray(vault.id, ids), eq(vault.userId, session.userId)));
    return { success: true };
  });

export const exportVaultItemsAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    let query = db.select().from(vault).where(eq(vault.userId, session.userId));

    if (ids.length > 0) {
      query = db.select().from(vault).where(and(inArray(vault.id, ids), eq(vault.userId, session.userId)));
    }

    const items = await query;

    const exportedItems = items.map((item) => ({
      platform: item.platform,
      username: item.username,
      password: item.passwordEncrypted.startsWith("v2:") ? item.passwordEncrypted : decryptPassword(item.passwordEncrypted),
      note: item.note,
    }));

    return { success: true, data: exportedItems };
  });

export const bulkCreateVaultItemsAction = actionClient
  .schema(z.object({
    items: z.array(z.object({
      platform: z.string().min(1),
      username: z.string().min(1),
      password: z.string().min(1),
      note: z.string().nullable().optional(),
    }))
  }))
  .action(async ({ parsedInput: { items } }) => {
    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    if (items.length === 0) return { success: true };

    const approxBytes = items.reduce((sum, item) => sum + item.platform.length + item.username.length + item.password.length + (item.note?.length || 0), 0);
    if (approxBytes > 0) {
      const hasQuota = await checkNeonQuota(session.userId, approxBytes);
      if (!hasQuota) {
        return { failure: "NeonDB storage limit of 150MB exceeded. Please delete some items or import in smaller batches." };
      }
    }

    const insertData = items.map((item) => ({
      userId: session.userId,
      platform: item.platform,
      username: item.username,
      passwordEncrypted: item.password.startsWith("v2:") ? item.password : encryptPassword(item.password),
      note: item.note,
    }));

    await db.insert(vault).values(insertData);
    return { success: true };
  });

export const getVaultItemsForMigrationAction = actionClient
  .action(async () => {
    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    const items = await db.select({
      id: vault.id,
      passwordEncrypted: vault.passwordEncrypted,
    }).from(vault).where(eq(vault.userId, session.userId));

    const mappedItems = items.map(item => ({
      id: item.id,
      passwordEncrypted: item.passwordEncrypted.startsWith("v2:") 
        ? item.passwordEncrypted 
        : decryptPassword(item.passwordEncrypted)
    }));

    return { success: true, data: mappedItems };
  });

export const bulkUpdateVaultPasswordsAction = actionClient
  .schema(z.object({
    items: z.array(z.object({
      id: z.string().uuid(),
      passwordEncrypted: z.string()
    }))
  }))
  .action(async ({ parsedInput: { items } }) => {
    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    if (items.length === 0) return { success: true };

    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(vault)
          .set({ passwordEncrypted: item.passwordEncrypted })
          .where(and(eq(vault.id, item.id), eq(vault.userId, session.userId)));
      }
    });

    return { success: true };
  });
