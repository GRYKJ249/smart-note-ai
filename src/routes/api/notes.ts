import { createFileRoute } from "@tanstack/react-router";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import { notes } from "@/lib/server/schema";
import { z } from "zod";

const input = z.object({ title: z.string().trim().min(1).max(200), content: z.string().max(200000) });

export const Route = createFileRoute("/api/notes")({ server: { handlers: {
  GET: async ({ request }) => { const user = await getSessionUser(request); if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 }); return Response.json({ notes: await getDatabase().select().from(notes).where(eq(notes.userId, user.id)).orderBy(desc(notes.updatedAt)) }); },
  POST: async ({ request }) => { const user = await getSessionUser(request); if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 }); const parsed = input.safeParse(await request.json().catch(() => null)); if (!parsed.success) return Response.json({ error: "Invalid note" }, { status: 400 }); const note = { id: randomUUID(), userId: user.id, ...parsed.data }; await getDatabase().insert(notes).values(note); return Response.json({ note }, { status: 201 }); },
} } });
