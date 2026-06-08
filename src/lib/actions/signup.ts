"use server";

import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { sendVerificationEmail } from "@/lib/mail";
import { eq } from "drizzle-orm";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

const actionClient = createSafeActionClient();

// ============================================================================
// SEND OTP ACTION
// ============================================================================

const sendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const sendOtpAction = actionClient
  .schema(sendOtpSchema)
  .action(async ({ parsedInput: { email } }) => {
    // Artificial delay to prevent brute-force
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists in users table
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      return { failure: "Email is already registered" };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in DB (Delete any existing OTPs for this email first)
    await db.delete(verificationTokens).where(eq(verificationTokens.email, normalizedEmail));
    
    await db.insert(verificationTokens).values({
      email: normalizedEmail,
      token: otp,
      expiresAt: expiresAt.toISOString(),
    });

    // Send email
    try {
      await sendVerificationEmail(normalizedEmail, otp);
      return { success: true };
    } catch (e) {
      console.error("Failed to send OTP email:", e);
      return { failure: "Failed to send verification email. Please try again." };
    }
  });

// ============================================================================
// VERIFY AND SIGNUP ACTION
// ============================================================================

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupAction = actionClient
  .schema(signupSchema)
  .action(async ({ parsedInput: { email, otp, username, password } }) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verify OTP
    const [tokenRecord] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.email, normalizedEmail))
      .limit(1);

    if (!tokenRecord) {
      return { failure: "No verification code found for this email" };
    }

    if (tokenRecord.token !== otp) {
      return { failure: "Invalid verification code" };
    }

    if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      await db.delete(verificationTokens).where(eq(verificationTokens.id, tokenRecord.id));
      return { failure: "Verification code has expired. Please request a new one." };
    }

    // 2. Verify Username is unique
    const [existingUsername] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUsername) {
      return { failure: "Username is already taken" };
    }

    // 3. Create User
    const bcrypt = (await import("bcryptjs")).default;
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      await db.insert(users).values({
        email: normalizedEmail,
        username,
        passwordHash,
        role: "USER", // Default role
      });

      // 4. Delete the OTP
      await db.delete(verificationTokens).where(eq(verificationTokens.id, tokenRecord.id));

      return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation in Postgres
         return { failure: "Email or username is already taken" };
      }
      console.error("Signup error:", error);
      return { failure: "An error occurred during registration" };
    }
  });
