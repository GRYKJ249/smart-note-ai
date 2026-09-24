import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { Markdown } from "@/components/chat/Markdown";
import { ImageCard } from "@/components/chat/ImageCard";
import { addMessage, listMessages, saveImageData, updateThread } from "@/lib/local-db";
import { useLang } from "@/lib/i18n";
import { detectImageRequest } from "@/lib/image-intent";
import { streamImage } from "@/lib/stream-image";
import { PENDING_KEY } from "./index";
import { AttachmentPreview, ChatComposer } from "@/components/chat/ChatComposer";
import type { FileUIPart } from "ai";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation — Opera AI" },
      { name: "description", content: "Continue a private, browser-saved conversation with Opera AI." },
      { property: "og:title", content: "Conversation — Opera AI" },
      { property: "og:description", content: "Continue a private, browser-saved conversation with Opera AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreadPage,
});

type ImageTurn = {
  id: string;
  prompt: string;
  /** Number of text messages that precede this image in the thread. */
  anchor: number;
  status: "loading" | "done" | "error";
  dataUrl?: string;
  path?: string | null;
  error?: string;
};

type LoadedThread = { messages: UIMessage[]; images: ImageTurn[] };

function ThreadPage() {
  const { threadId } = Route.useParams();

  const { data, isLoading } = useQuery<LoadedThread>({
    queryKey: ["chat-messages", threadId],
    queryFn: () => {
      const rows = listMessages(threadId);

      const messages: UIMessage[] = [];
      const images: ImageTurn[] = [];
      for (const row of rows) {
        if (row.image_url) {
          images.push({
            id: row.id,
            prompt: row.content,
            anchor: messages.length,
            status: "done",
            path: row.image_url,
          });
        } else {
          messages.push({
            id: row.id,
            role: row.role,
            parts: [{ type: "text" as const, text: row.content }, ...(row.files ?? [])],
          });
        }
      }
      return { messages, images };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <Thread key={threadId} threadId={threadId} initial={data} />;
}

function Thread({ threadId, initial }: { threadId: string; initial: LoadedThread }) {
  const { t, lang } = useLang();
  const queryClient = useQueryClient();
  const [imageTurns, setImageTurns] = useState<ImageTurn[]>(initial.images);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    id: threadId,
    messages: initial.messages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => toast.error(error.message),
    onFinish: ({ message }) => {
      const text = message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
      if (!text) return;
      addMessage({ thread_id: threadId, role: "assistant", content: text });
      updateThread(threadId, {});
    },
  });

  const generatingImage = imageTurns.some((turn) => turn.status === "loading");
  const busy = status === "submitted" || status === "streaming" || generatingImage;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, imageTurns]);

  const updateTurn = (id: string, patch: Partial<ImageTurn>) =>
    setImageTurns((turns) => turns.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));

  const runImageGeneration = async (prompt: string, anchor: number) => {
    const id = crypto.randomUUID();
    setImageTurns((turns) => [...turns, { id, prompt, anchor, status: "loading" }]);

    try {
      let finalUrl: string | undefined;
      await streamImage("/api/generate-image", { prompt }, (frame, isFinal) => {
        updateTurn(id, { dataUrl: frame });
        if (isFinal) finalUrl = frame;
      });

      if (!finalUrl) throw new Error("No image returned");
      const saved = await saveImageData(finalUrl, prompt);
      addMessage({
        thread_id: threadId,
        role: "assistant",
        content: prompt,
        image_url: saved.path,
      });
      updateTurn(id, { path: saved.path, dataUrl: finalUrl, status: "done" });
      updateThread(threadId, {});
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      const message = /safety|policy|moderation|content.?filter|refus|unsafe|blocked/i.test(raw)
        ? t("This request conflicts with image safety rules. Adjust it and try again.", "هذا الطلب لا يتوافق مع قواعد أمان الصور. عدّله وحاول مرة أخرى.")
        : raw;
      updateTurn(id, { status: "error", error: message });
      toast.error(message);
    }
  };

  const send = (raw: string, files: FileUIPart[] = []) => {
    const text = raw.trim();
    if (!text && files.length === 0) return;

    addMessage({ thread_id: threadId, role: "user", content: text, files });

    const isFirst = messages.length === 0 && imageTurns.length === 0;
    if (isFirst) {
      const titleSource = text || files[0]?.filename || "New chat";
      const title = titleSource.slice(0, 48) + (titleSource.length > 48 ? "…" : "");
      updateThread(threadId, { title });
      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    }

    const intent = detectImageRequest(text);
    if (intent.isImage && files.length === 0) {
      // Show the user's request in the transcript without calling the text model.
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] },
      ]);
      void runImageGeneration(intent.prompt, messages.length + 1);
      return;
    }

    sendMessage({ text: text || t("Describe and analyze these attachments in detail.", "صف وحلّل هذه المرفقات بالتفصيل."), files });
  };

  // A message typed on the "new chat" screen is handed over through sessionStorage.
  const pendingHandled = useRef(false);
  useEffect(() => {
    if (pendingHandled.current || typeof window === "undefined") return;
    pendingHandled.current = true;
    const pending = sessionStorage.getItem(PENDING_KEY);
    const storedFiles = sessionStorage.getItem(`${PENDING_KEY}-files`);
    const pendingFiles = storedFiles ? JSON.parse(storedFiles) as FileUIPart[] : [];
    if (!pending && pendingFiles.length === 0) return;
    sessionStorage.removeItem(PENDING_KEY);
    sessionStorage.removeItem(`${PENDING_KEY}-files`);
    // Wait one tick so the chat stream is listening before the first message goes out.
    window.setTimeout(() => send(pending ?? "", pendingFiles), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const renderImagesAt = (index: number) =>
    imageTurns
      .filter((turn) => turn.anchor === index)
      .map((turn) => (
        <div key={turn.id} className="flex gap-3">
          <OperaLogoMark className="h-8 w-8 shrink-0" />
          <ImageCard
            prompt={turn.prompt}
            dataUrl={turn.dataUrl}
            path={turn.path}
            status={turn.status}
            error={turn.error}
          />
        </div>
      ));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && imageTurns.length === 0 && (
            <div className="glass-strong mt-10 rounded-xl p-10 text-center">
              <OperaLogoMark className="mx-auto h-20 w-20" label="Opera AI" />
              <h1 className="mt-5 font-display text-2xl font-bold">
                {t("How can I help you today?", "كيف أقدر أساعدك اليوم؟")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  "Ask anything — code, ideas, writing, analysis or images.",
                  "اسأل عن أي شيء — برمجة، أفكار، كتابة، تحليل أو صور.",
                )}
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {[
                  t("Explain React Server Components", "اشرح لي مكونات الخادم في React"),
                   t("/image an orbital city above Earth", "ولد صورة مدينة مدارية فوق الأرض"),
                  t("Debug this SQL query", "صحّح استعلام SQL هذا"),
                  t("Plan a 7-day study schedule", "خطّط جدول مذاكرة لسبعة أيام"),
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => send(sample)}
                    className="glass rounded-xl px-4 py-3 text-start text-sm transition hover:border-primary/50"
                  >
                    <Sparkles className="mb-1.5 h-4 w-4 text-primary" />
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          {renderImagesAt(0)}

          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const text = message.parts
              .filter((p) => p.type === "text")
              .map((p) => (p as { text: string }).text)
              .join("");
            const reasoning = message.parts
              .filter((p) => p.type === "reasoning")
              .map((p) => (p as { text?: string }).text ?? "")
              .join("")
              .trim();

            return (
              <div key={message.id}>
                <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  {!isUser && (
                    <OperaLogoMark className="h-8 w-8 shrink-0" />
                  )}
                  <div className={`min-w-0 max-w-[85%] ${isUser ? "text-end" : ""}`}>
                    {reasoning && !isUser && (
                      <details className="glass mb-2 rounded-xl px-3 py-2 text-xs text-muted-foreground">
                        <summary className="flex cursor-pointer items-center gap-1.5">
                          <Brain className="h-3.5 w-3.5" />
                          {t("Thinking", "التفكير")}
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap">{reasoning}</p>
                      </details>
                    )}
                    {message.parts.some((part) => part.type === "file") && (
                      <AttachmentPreview files={message.parts.filter((part): part is FileUIPart => part.type === "file")} />
                    )}
                    {text && (
                      <div
                        className={
                          isUser
                            ? "inline-block rounded-2xl bg-primary/15 px-4 py-2.5 text-start text-[15px]"
                            : "glass rounded-2xl px-4 py-3 text-start"
                        }
                      >
                        {isUser ? <p className="whitespace-pre-wrap">{text}</p> : <Markdown content={text} />}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 space-y-6">{renderImagesAt(index + 1)}</div>
              </div>
            );
          })}

          {status === "submitted" && !generatingImage && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {t("Opera AI is thinking…", "أوبرا الذكي يفكّر…")}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-glass-border px-4 py-4">
        <ChatComposer status={status} disabled={generatingImage} onStop={stop} onSubmit={({ text, files }) => send(text, files)} />
      </div>
    </div>
  );
}
