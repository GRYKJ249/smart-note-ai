import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Opera AI — Private AI Chat" },
      { name: "description", content: "Ask Opera AI anything privately and keep your conversations in your browser." },
      { property: "og:title", content: "Opera AI — Private AI Chat" },
      { property: "og:description", content: "Private AI chat, image creation, and creative tools in one workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
});
