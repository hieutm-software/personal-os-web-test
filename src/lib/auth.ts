import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema/index";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";

// ----------------------------------------------------------------------------
// CONSTANTS & INITIALIZATION
// ----------------------------------------------------------------------------

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is explicitly required but missing in environment variables.",
  );
}

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export type AuthPayload = {
  userId: string;
  role: "USER" | "ADMIN";
};

export type ValidationResult =
  | { error: string; token: null; user: null }
  | { error: null; token: string; user: AuthPayload };

// ----------------------------------------------------------------------------
// LOGIC
// ----------------------------------------------------------------------------

/**
 * Generates a secure, Edge-compatible JWT using jose.
 */
export async function createSessionToken(
  payload: AuthPayload,
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Sessions valid for 7 days
    .sign(SECRET_KEY);
}

/**
 * Verifies and decodes an Edge-compatible JWT.
 * Returns null if the token is invalid or expired.
 */
export async function verifySessionToken(
  token: string,
): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    
    // Ensure the token wasn't invalidated by a recent password change
    const [user] = await db
      .select({ updatedAt: users.updatedAt })
      .from(users)
      .where(eq(users.id, payload.userId as string))
      .limit(1);

    if (!user) return null;

    if (user.updatedAt && payload.iat) {
      const tokenIssuedAt = payload.iat * 1000;
      const passwordUpdatedAt = new Date(user.updatedAt).getTime();
      
      // If token was issued before the password was updated, reject it
      if (tokenIssuedAt + 1000 < passwordUpdatedAt) {
        return null;
      }
    }

    return payload as AuthPayload;
  } catch {
    // Silently catch validation errors (e.g., expired token, malformed signature)
    return null;
  }
}

/**
 * Validates plaintext credentials against the database and generates a JWT.
 */
export async function validateCredentials(
  username: string,
  passwordPlain: string,
  metadata?: { device: string; ip: string; location: string }
): Promise<ValidationResult> {
  // Query user from database
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    return { error: "Invalid credentials", token: null, user: null };
  }

  // MANDATORY: Dynamic import for bcryptjs to bypass Edge runtime strictness in Server Actions
  const bcrypt = (await import("bcryptjs")).default;
  const isPasswordValid = await bcrypt.compare(
    passwordPlain,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    return { error: "Invalid credentials", token: null, user: null };
  }

  // Construct standard payload
  const payload: AuthPayload = {
    userId: user.id,
    role: user.role,
  };

  // Generate JWT
  const token = await createSessionToken(payload);

  if (metadata) {
    await db.insert(sessions).values({
      userId: user.id,
      device: metadata.device,
      ip: metadata.ip,
      location: metadata.location,
    });
  }

  return { error: null, token, user: payload };
}
