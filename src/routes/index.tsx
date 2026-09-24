import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Smart Note AI — Your ideas, amplified" }, { name: "description", content: "A powerful private workspace for notes, ideas and intelligent creation." }] }),
  beforeLoad: () => { throw redirect({ to: "/chat" }); },
});
