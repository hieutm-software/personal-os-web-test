import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const allNotes = await db.select({ id: notes.id, title: notes.title, content: notes.content }).from(notes);
    return NextResponse.json(allNotes);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
