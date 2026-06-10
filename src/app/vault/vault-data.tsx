import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { vault } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import VaultClient from "./vault-client";

export async function VaultData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  const items = await db
    .select({
      id: vault.id,
      platform: vault.platform,
      username: vault.username,
      note: vault.note,
      updatedAt: vault.updatedAt,
    })
    .from(vault)
    .where(eq(vault.userId, session.userId))
    .orderBy(desc(vault.createdAt));

  return <VaultClient initialItems={items} />;
}
