import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/server/db";
import { users } from "@/lib/server/schema";
import { verifyPassword } from "@/lib/server/password";
import { createSession, SESSION_COOKIE, cookieOptions } from "@/lib/server/auth";

const schema = z.object({ email: z.string().email().max(320), password: z.string().min(1).max(200) });

export const Route = createFileRoute("/api/auth/login")({ server: { handlers: { POST: async ({ request }) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Email and password are required" }, { status: 400 });
  const user = (await getDatabase().select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1))[0];
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return Response.json({ error: "Invalid email or password" }, { status: 401 });
  const session = await createSession(user.id);
  return Response.json({ user: { id: user.id, email: user.email, name: user.name } }, { headers: { "Set-Cookie": `${SESSION_COOKIE}=${session.id}; ${cookieOptions(Math.floor((session.expiresAt.getTime() - Date.now()) / 1000))}` } });
} } } });
