import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/server/auth";

export const Route = createFileRoute("/api/auth/me")({ server: { handlers: { GET: async ({ request }) => {
  const user = await getSessionUser(request);
  return Response.json({ user: user ? { id: user.id, email: user.email, name: user.name } : null });
} } } });
