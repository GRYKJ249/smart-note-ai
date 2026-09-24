import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AudioLines, Image, Lightbulb, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { createThread } from "@/lib/local-db";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/chat/ChatComposer";
import type { FileUIPart } from "ai";

export const PENDING_KEY = "opera-pending-message";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "New conversation — Opera AI" },
      { name: "description", content: "Start a saved conversation with the Opera AI assistant." },
      { property: "og:title", content: "New conversation — Opera AI" },
      { property: "og:description", content: "Start a saved conversation with the Opera AI assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatIndex,
});

function ChatIndex() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingFilesRef = useRef<FileUIPart[]>([]);

  const start = (text: string, files: FileUIPart[] = []) => {
    const message = text.trim();
    if ((!message && files.length === 0) || busy) return;

    if (typeof window !== "undefined") sessionStorage.setItem(PENDING_KEY, message);
    if (typeof window !== "undefined") sessionStorage.setItem(`${PENDING_KEY}-files`, JSON.stringify(files));

    setBusy(true);
    const titleSource = message || files[0]?.filename || "New chat";
    const title = titleSource.slice(0, 48) + (titleSource.length > 48 ? "…" : "");
    try {
      const thread = createThread(title);
      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "Could not start the conversation");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-4 pb-8 pt-[clamp(4.5rem,16vh,9rem)]">
      <OperaLogoMark className="h-32 w-32 sm:h-36 sm:w-36" label="Opera AI" />
      <h1 className="mt-5 text-center text-3xl font-medium sm:text-4xl">
        {t("Opera AI", "أوبرا AI")}
      </h1>

      <div className="mt-8 w-full">
        <ChatComposer status={busy ? "submitted" : "ready"} disabled={busy} onSubmit={({ text, files }) => start(text, files)} />
      </div>
      <div className="mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
        {[
          { icon: Lightbulb, en: "Chat suggestions", ar: "اقتراحات المحادثة", value: "Give me a useful idea" },
          { icon: Image, en: "Create & edit images", ar: "إنشاء وتعديل الصور", value: "/image " },
          { icon: AudioLines, en: "Voice chat", ar: "محادثة صوتية", value: "" },
          { icon: Sparkles, en: "Explore Opera AI", ar: "اكتشف أوبرا AI", value: "What can you help me with?" },
        ].map((item) => (
          <Button key={item.en} type="button" variant="secondary" className="h-11 rounded-full px-4 text-sm" onClick={() => setInput(item.value)}>
            <item.icon />{t(item.en, item.ar)}
          </Button>
        ))}
      </div>
    </div>
  );
}
