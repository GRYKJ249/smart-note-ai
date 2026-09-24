import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, Mic, Music2, Pause, Play, Sparkles, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listImages, saveImageData } from "@/lib/local-db";

type AudioClip = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

const AUDIO_KEY = "smart-note-audio-clips";

function readAudioClips(): AudioClip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUDIO_KEY);
    return raw ? (JSON.parse(raw) as AudioClip[]) : [];
  } catch {
    return [];
  }
}

function writeAudioClips(clips: AudioClip[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_KEY, JSON.stringify(clips));
}

export function MediaStudio() {
  const [prompt, setPrompt] = useState("A cinematic neon city skyline at sunset with glass towers and reflections");
  const [images, setImages] = useState(listImages());
  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);
  const [generating, setGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);

  useEffect(() => {
    setAudioClips(readAudioClips());
  }, []);

  useEffect(() => {
    writeAudioClips(audioClips);
  }, [audioClips]);

  const quickIdeas = useMemo(
    () => [
      "Luxury product shot for a smart notebook",
      "Futuristic workspace in a dark glass office",
      "Minimalist Arabic calligraphy poster",
      "Dreamy mountain lake with aurora lights",
    ],
    [],
  );

  const refreshImages = () => setImages(listImages());

  const generateImage = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, stream: false, size: "1024x1024" }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? "Image generation failed");
      }

      const blob = await response.blob();
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Could not read generated image"));
        reader.readAsDataURL(blob);
      });

      await saveImageData(dataUrl, prompt);
      refreshImages();
      toast.success("Image created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio recording is not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) {
          setRecordingError("No audio captured");
          return;
        }
        const url = URL.createObjectURL(blob);
        const clip: AudioClip = {
          id: crypto.randomUUID(),
          name: `Voice note ${audioClips.length + 1}`,
          url,
          createdAt: new Date().toISOString(),
        };
        setAudioClips((prev) => [clip, ...prev]);
        setRecordingError(null);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Microphone access failed";
      setRecordingError(message);
      toast.error(message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const removeAudio = (id: string) => {
    setAudioClips((prev) => {
      const next = prev.filter((clip) => clip.id !== id);
      const target = prev.find((clip) => clip.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return next;
    });
    if (currentAudioId === id) setCurrentAudioId(null);
  };

  return (
    <section className="mt-8 space-y-6 rounded-3xl border border-border bg-card/80 p-5 shadow-glow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Music2 className="h-4 w-4" /> Media studio
          </p>
          <h2 className="mt-2 text-2xl font-bold">Create visuals, sound, and voice notes</h2>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-background/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Wand2 className="h-4 w-4" /> AI image generator
          </div>
          <textarea
            value={prompt}
            rows={4}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the image you want to create"
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary"
          />
          <div className="flex flex-wrap gap-2">
            {quickIdeas.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setPrompt(idea)}
                className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              >
                {idea}
              </button>
            ))}
          </div>
          <Button onClick={() => void generateImage()} disabled={generating || !prompt.trim()} className="w-full rounded-xl">
            <Sparkles className="h-4 w-4" />
            {generating ? "Generating..." : "Generate artwork"}
          </Button>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Mic className="h-4 w-4" /> Voice recorder
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant={isRecording ? "destructive" : "default"} onClick={isRecording ? stopRecording : startRecording} className="rounded-xl">
                {isRecording ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isRecording ? "Stop recording" : "Record voice"}
              </Button>
              {recordingError && <span className="text-sm text-destructive">{recordingError}</span>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Camera className="h-4 w-4" /> Latest creations
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {images.slice(0, 4).map((item) => (
              <div key={item.id} className="overflow-hidden rounded-xl border border-border bg-card/50">
                <img src={item.path} alt={item.prompt} className="h-32 w-full object-cover" />
                <div className="p-2 text-xs text-muted-foreground">{item.prompt.slice(0, 42)}{item.prompt.length > 42 ? "…" : ""}</div>
              </div>
            ))}
            {images.length === 0 && <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No artwork created yet.</div>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background/40 p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
          <Music2 className="h-4 w-4" /> Voice clips
        </div>
        {audioClips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No recordings yet. Tap record to capture a quick idea or voice memo.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {audioClips.map((clip) => {
              const isPlaying = currentAudioId === clip.id;
              return (
                <div key={clip.id} className="rounded-xl border border-border bg-card/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{clip.name}</span>
                    <button type="button" aria-label="Remove recording" onClick={() => removeAudio(clip.id)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        if (isPlaying) {
                          setCurrentAudioId(null);
                        } else {
                          setCurrentAudioId(clip.id);
                        }
                      }}
                      className="rounded-lg"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <audio
                      key={clip.id}
                      controls
                      src={clip.url}
                      className="h-10 w-full"
                      onPlay={() => setCurrentAudioId(clip.id)}
                      onPause={() => setCurrentAudioId((value) => (value === clip.id ? null : value))}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">{new Date(clip.createdAt).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
