"use server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { actionClient } from "./client";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const changePasswordAction = actionClient
  .schema(changePasswordSchema)
  .action(async ({ parsedInput: { currentPassword, newPassword } }) => {
    // Artificial delay to prevent brute-force attacks on password mutation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    // Query user enforcing strict data isolation via ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) return { failure: "User not found" };

    // Dynamic import for bcryptjs to bypass Edge runtime restrictions
    const bcrypt = (await import("bcryptjs")).default;

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) return { failure: "Incorrect current password" };

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, session.userId));

    // Sign out everywhere: Delete all DB sessions for this user
    const { sessions } = await import("@/lib/db/schema");
    await db.delete(sessions).where(eq(sessions.userId, session.userId));

    // Clear current cookie
    (await cookies()).delete("session");

    return { success: true };
  });

export const verifyCurrentPasswordAction = actionClient
  .schema(z.object({ password: z.string().min(1) }))
  .action(async ({ parsedInput: { password } }) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    let session;
    try {
      session = await getSession();
    } catch {
      return { failure: "Unauthorized" };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) return { failure: "User not found" };

    const bcrypt = (await import("bcryptjs")).default;
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) return { failure: "Incorrect password" };

    return { success: true };
  });
