import { useRef, useState } from "react";
import type { ChatStatus, FileUIPart } from "ai";
import { FileText, ImagePlus, Mic, Paperclip, Square, X } from "lucide-react";
import { toast } from "sonner";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { recordWav } from "@/lib/record-wav";
import { useLang } from "@/lib/i18n";

type Recorder = Awaited<ReturnType<typeof recordWav>>;

export function ChatComposer({
  status,
  disabled,
  onStop,
  onSubmit,
}: {
  status: ChatStatus;
  disabled?: boolean;
  onStop?: () => void;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
}) {
  const { t, lang } = useLang();
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<Recorder | null>(null);

  const toggleRecording = async () => {
    try {
      if (recorderRef.current) {
        const file = await recorderRef.current.stop();
        recorderRef.current = null;
        setRecording(false);
        const body = new FormData();
        body.append("file", file, file.name);
        const response = await fetch("/api/transcribe", { method: "POST", body });
        const payload = (await response.json().catch(() => null)) as { text?: string; error?: { message?: string } } | null;
        if (!response.ok) throw new Error(payload?.error?.message ?? t("Voice transcription failed", "فشل تحويل الصوت إلى نص"));
        const text = payload?.text?.trim();
        if (!text) throw new Error(t("No speech was detected", "لم يتم اكتشاف كلام"));
        await onSubmit({ text, files: [] });
        return;
      }
      recorderRef.current = await recordWav();
      setRecording(true);
    } catch (error) {
      recorderRef.current = null;
      setRecording(false);
      toast.error(error instanceof Error ? error.message : t("Microphone is unavailable", "الميكروفون غير متاح"));
    }
  };

  return (
    <PromptInput
      accept="image/*,application/pdf,text/plain,text/markdown,text/csv,application/json"
      multiple
      maxFiles={5}
      maxFileSize={10 * 1024 * 1024}
      onError={(error) => toast.error(error.message)}
      onSubmit={onSubmit}
      className="mx-auto max-w-3xl"
    >
      <PromptInputTextarea
        autoFocus
        dir={lang === "ar" ? "rtl" : "ltr"}
        placeholder={t("Message Opera AI or attach a file…", "اكتب لأوبرا أو أرفق صورة أو مستندًا…")}
        disabled={disabled}
        className="min-h-20 text-base"
      />
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputButton
            onClick={() => document.querySelector<HTMLInputElement>('input[aria-label="Upload files"]')?.click()}
            tooltip={t("Attach image or document", "إرفاق صورة أو مستند")}
          >
            <Paperclip />
          </PromptInputButton>
          <PromptInputButton onClick={toggleRecording} tooltip={recording ? t("Stop recording", "إيقاف التسجيل") : t("Record voice", "تسجيل صوت")}>
            {recording ? <Square className="text-destructive" /> : <Mic />}
          </PromptInputButton>
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <ImagePlus className="h-3.5 w-3.5" /><FileText className="h-3.5 w-3.5" />
            {t("Images & documents", "صور ومستندات")}
          </span>
        </PromptInputTools>
        <PromptInputSubmit status={status} {...(onStop ? { onStop } : {})} disabled={!!disabled && status === "ready"} />
      </PromptInputFooter>
    </PromptInput>
  );
}

export function AttachmentPreview({ files }: { files: FileUIPart[] }) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file, index) => (
        file.mediaType.startsWith("image/") && file.url ? (
          <img key={`${file.filename}-${index}`} src={file.url} alt={file.filename ?? "Image"} className="h-32 w-32 rounded-lg border border-border object-cover" />
        ) : (
        <span key={`${file.filename}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs">
          <FileText className="h-3.5 w-3.5" />
          <span className="max-w-48 truncate">{file.filename ?? tFallback(file.mediaType)}</span>
        </span>
        )
      ))}
    </div>
  );
}

const tFallback = (mediaType: string) => mediaType.startsWith("image/") ? "Image" : "Document";