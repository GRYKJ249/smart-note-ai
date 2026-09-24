import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Menu,
  MessageSquare,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { deleteThread, listThreads } from "@/lib/local-db";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/chat")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chat workspace — Opera AI" },
      { name: "description", content: "Talk to Opera AI: a fast, streaming assistant with saved conversations." },
      { property: "og:title", content: "Chat workspace — Opera AI" },
      { property: "og:description", content: "Talk to Opera AI: a fast, streaming assistant with saved conversations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const params = useParams({ strict: false }) as { threadId?: string };
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-conversations", onOpen);
    return () => window.removeEventListener("open-conversations", onOpen);
  }, []);

  const { data: threads } = useQuery({
    queryKey: ["chat-threads"],
    queryFn: () => listThreads(),
  });

  const removeThread = (id: string) => {
    deleteThread(id);
    void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    if (params.threadId === id) navigate({ to: "/chat" });
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="flex h-full min-h-0 overflow-hidden">
      {open && (
        <button
          type="button"
          aria-label="close"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 z-40 w-72 flex-col border-e border-border bg-card transition-transform md:static md:translate-x-0 ${
          "flex"
        } ${
          lang === "ar" ? "right-0 border-s" : "left-0 border-e"
        } ${open ? "translate-x-0" : lang === "ar" ? "translate-x-full" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border p-4">
          <span className="font-display text-sm font-bold">{t("Conversations", "المحادثات")}</span>
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost !p-2 md:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <Link to="/chat" onClick={() => setOpen(false)} className="btn-hero w-full justify-center !py-2.5 text-sm">
            <Plus className="h-4 w-4" />
            {t("New chat", "محادثة جديدة")}
          </Link>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {(threads ?? []).map((thread) => (
            <div
              key={thread.id}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                params.threadId === thread.id
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-glass-border/40"
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <Link
                to="/chat/$threadId"
                params={{ threadId: thread.id }}
                onClick={() => setOpen(false)}
                className="min-w-0 flex-1 truncate"
              >
                {thread.title}
              </Link>
              <button
                type="button"
                onClick={() => removeThread(thread.id)}
                className="opacity-0 transition group-hover:opacity-100"
                aria-label="delete"
              >
                <Trash2 className="h-3.5 w-3.5 hover:text-destructive" />
              </button>
            </div>
          ))}
          {threads?.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t("No conversations yet.", "لا توجد محادثات بعد.")}
            </p>
          )}
        </nav>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
