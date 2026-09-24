import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/server/db";
import { users } from "@/lib/server/schema";
import { hashPassword } from "@/lib/server/password";
import { createSession, SESSION_COOKIE, cookieOptions } from "@/lib/server/auth";

const schema = z.object({ email: z.string().email().max(320), name: z.string().trim().min(2).max(120), password: z.string().min(8).max(200) });

export const Route = createFileRoute("/api/auth/register")({ server: { handlers: { POST: async ({ request }) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid registration details" }, { status: 400 });
  const { email, name, password } = parsed.data;
  const db = getDatabase();
  if ((await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1)).length) return Response.json({ error: "Email is already registered" }, { status: 409 });
  const userId = randomUUID();
  await db.insert(users).values({ id: userId, email: email.toLowerCase(), name, passwordHash: await hashPassword(password) });
  const session = await createSession(userId);
  return Response.json({ user: { id: userId, email: email.toLowerCase(), name } }, { headers: { "Set-Cookie": `${SESSION_COOKIE}=${session.id}; ${cookieOptions(Math.floor((session.expiresAt.getTime() - Date.now()) / 1000))}` }, status: 201 });
} } } });
