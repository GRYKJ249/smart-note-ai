import { createFileRoute } from "@tanstack/react-router";
import { destroySession, SESSION_COOKIE, cookieOptions } from "@/lib/server/auth";

export const Route = createFileRoute("/api/auth/logout")({ server: { handlers: { POST: async ({ request }) => {
  await destroySession(request);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": `${SESSION_COOKIE}=; ${cookieOptions(0)}` } });
} } } });
