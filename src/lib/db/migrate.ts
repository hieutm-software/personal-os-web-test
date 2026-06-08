import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";


config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Running manual migrations...");
  try {
    // Attempt to create verification_tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS "verification_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" text NOT NULL,
        "token" text NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `;
    console.log("verification_tokens table created.");

    // Attempt to add email to users
    try {
      await sql`ALTER TABLE "users" ADD COLUMN "email" text;`;
      console.log("Added email column to users.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (!e.message.includes("already exists")) {
        console.error(e);
      }
    }

    try {
      await sql`ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");`;
      console.log("Added unique constraint on users email.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (!e.message.includes("already exists") && !e.message.includes("multiple null")) {
         console.error(e);
      }
    }

    console.log("Migrations completed.");
  } catch (err) {
    console.error("Migration failed", err);
  }
}

main();
