"use server";

import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { vault } from "@/lib/db/schema";
import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { z } from "zod";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const actionClient = createSafeActionClient();

// Crypto Utils
function getEncryptionKey() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  return crypto.createHash("sha256").update(process.env.JWT_SECRET).digest();
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

// Actions
export const createVaultItemAction = actionClient
  .schema(z.object({
    platform: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
    note: z.string().optional(),
  }))
  .action(async ({ parsedInput: { platform, username, password, note } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    const passwordEncrypted = encryptPassword(password);

    await db.insert(vault).values({
      userId: session.userId,
      platform,
      username,
      passwordEncrypted,
      note,
    });

    revalidatePath("/vault");
    return { success: true };
  });

export const deleteVaultItemAction = actionClient
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput: { id } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    await db.delete(vault).where(and(eq(vault.id, id), eq(vault.userId, session.userId)));
    revalidatePath("/vault");
    return { success: true };
  });

export const updateVaultItemAction = actionClient
  .schema(z.object({
    id: z.string(),
    platform: z.string().min(1),
    username: z.string().min(1),
    password: z.string().optional(),
    note: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput: { id, platform, username, password, note } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    const updateData: Record<string, string | null> = {
      platform,
      username,
      note: note ?? null,
      updatedAt: new Date().toISOString(),
    };

    if (password) {
      updateData.passwordEncrypted = encryptPassword(password);
    }

    await db
      .update(vault)
      .set(updateData)
      .where(and(eq(vault.id, id), eq(vault.userId, session.userId)));

    revalidatePath("/vault");
    return { success: true };
  });

export const getDecryptedPasswordAction = actionClient
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput: { id } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    const [item] = await db.select().from(vault).where(and(eq(vault.id, id), eq(vault.userId, session.userId))).limit(1);
    if (!item) return { failure: "Not found" };

    const password = decryptPassword(item.passwordEncrypted);
    return { success: true, password };
  });

export const bulkDeleteVaultItemsAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    const { inArray } = await import("drizzle-orm");

    await db.delete(vault).where(and(inArray(vault.id, ids), eq(vault.userId, session.userId)));
    revalidatePath("/vault");
    return { success: true };
  });

export const exportVaultItemsAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    const { inArray } = await import("drizzle-orm");

    let query = db.select().from(vault).where(eq(vault.userId, session.userId));
    
    if (ids.length > 0) {
      query = db.select().from(vault).where(and(inArray(vault.id, ids), eq(vault.userId, session.userId)));
    }

    const items = await query;

    const exportedItems = items.map((item) => ({
      platform: item.platform,
      username: item.username,
      password: decryptPassword(item.passwordEncrypted),
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
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    if (items.length === 0) return { success: true };

    const insertData = items.map((item) => ({
      userId: session.userId,
      platform: item.platform,
      username: item.username,
      passwordEncrypted: encryptPassword(item.password),
      note: item.note,
    }));

    await db.insert(vault).values(insertData);
    revalidatePath("/vault");
    return { success: true };
  });
