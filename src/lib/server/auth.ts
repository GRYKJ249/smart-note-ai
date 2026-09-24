import { randomBytes } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDatabase } from "./db";
import { sessions, users, type User } from "./schema";

export const SESSION_COOKIE = "smart_note_session";
const SESSION_DAYS = 30;

export function cookieOptions(maxAge: number) {
  return `Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}Max-Age=${maxAge}`;
}

export async function createSession(userId: string): Promise<{ id: string; expiresAt: Date }> {
  const id = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await getDatabase().insert(sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function getSessionUser(request: Request): Promise<User | null> {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const sessionId = match?.[1];
  if (!sessionId) return null;
  const rows = await getDatabase().select({ session: sessions, user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date()))).limit(1);
  return rows[0]?.user ?? null;
}

export async function destroySession(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  const sessionId = header.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (sessionId) await getDatabase().delete(sessions).where(eq(sessions.id, sessionId));
}
