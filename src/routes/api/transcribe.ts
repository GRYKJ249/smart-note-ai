import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 14 * 1024 * 1024;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared > MAX_BYTES + 256_000) return new Response("Recording is too large", { status: 413 });
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI voice service is not configured", { status: 500 });
        const input = await request.formData();
        const file = input.get("file");
        if (!(file instanceof File) || !file.size || file.size > MAX_BYTES || !file.type.startsWith("audio/")) {
          return new Response("A valid audio recording is required", { status: 400 });
        }
        const form = new FormData();
        form.append("model", "google/gemini-3.5-transcribe");
        form.append("file", file, file.name);
        form.append("response_format", "json");
        const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: form,
          signal: request.signal,
        });
        return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" } });
      },
    },
  },
});