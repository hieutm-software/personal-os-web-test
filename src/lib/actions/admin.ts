"use server";

import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { actionClient } from "./client";

// ============================================================================
// CORE: Sudo Validation Logic
// ============================================================================
async function verifySudo(sudoPasswordPlain: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) throw new Error("Unauthorized");

  const session = await verifySessionToken(token);
  if (!session || session.role !== "ADMIN")
    throw new Error("Forbidden: Insufficient privileges");

  const [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!adminUser) throw new Error("Admin context lost");

  // MANDATORY: Dynamic import for bcryptjs to bypass Edge runtime strictness in Server Actions
  const bcrypt = (await import("bcryptjs")).default;
  const isSudoValid = await bcrypt.compare(
    sudoPasswordPlain,
    adminUser.passwordHash,
  );

  if (!isSudoValid) throw new Error("Invalid sudo password");

  return adminUser;
}

// ============================================================================
// ACTIONS
// ============================================================================

const createUserSchema = z.object({
  username: z.string().min(1, "Username is required").regex(/^[a-zA-Z0-9_]+$/, "Username must contain only English letters, numbers, and underscores without accents or spaces"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["USER", "ADMIN"]),
  sudoPassword: z.string().min(1, "Sudo password is required"),
});

export const createUserAction = actionClient
  .schema(createUserSchema)
  .action(
    async ({ parsedInput: { username, password, role, sudoPassword } }) => {
      try {
        await verifySudo(sudoPassword);

        const bcrypt = (await import("bcryptjs")).default;
        const passwordHash = await bcrypt.hash(password, 12);

        await db.insert(users).values({ username, passwordHash, role });

        revalidatePath("/settings/admin");
        return { success: true };
      } catch (error) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code === "23505")
          return { failure: "Username already exists" };
        return { failure: error instanceof Error ? error.message : "Failed to create user" };
      }
    },
  );

const deleteUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  sudoPassword: z.string().min(1, "Sudo password is required"),
});

export const deleteUserAction = actionClient
  .schema(deleteUserSchema)
  .action(async ({ parsedInput: { userId, sudoPassword } }) => {
    try {
      const admin = await verifySudo(sudoPassword);

      if (admin.id === userId) {
        return { failure: "Cannot delete your own admin account" };
      }

      await db.delete(users).where(eq(users.id, userId));

      revalidatePath("/settings/admin");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to delete user" };
    }
  });
