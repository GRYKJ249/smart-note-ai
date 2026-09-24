import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Note = { id: string; title: string; content: string; createdAt: string | Date; updatedAt: string | Date };

export function NotesWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [draft, setDraft] = useState({ title: "", content: "" });

  const load = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/notes?q=${encodeURIComponent(query)}`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load notes");
      setNotes(((await response.json()) as { notes: Note[] }).notes);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load notes"); }
    finally { setBusy(false); }
  };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [query]);

  const visibleNotes = useMemo(() => notes.slice(0, 12), [notes]);
  const create = async () => {
    if (!draft.title.trim() || !draft.content.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/notes", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
      if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error ?? "Could not save note");
      setDraft({ title: "", content: "" }); setOpen(false); await load(); toast.success("Note saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save note"); }
    finally { setBusy(false); }
  };

  return <section className="mt-8 rounded-2xl border border-border bg-card/70 p-5 shadow-sm sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" />Your knowledge base</p><h2 className="mt-1 text-2xl font-bold">Notes that stay with you</h2><p className="mt-1 text-sm text-muted-foreground">Search, capture, and grow your ideas in the cloud.</p></div><Button onClick={() => setOpen(true)} className="rounded-xl"><Plus className="h-4 w-4" />New note</Button></div>
    <div className="relative mt-6"><Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your notes…" className="w-full rounded-xl border border-input bg-background/60 py-2.5 ps-10 pe-4 text-sm outline-none focus:border-primary" /></div>
    {open && <div className="mt-4 rounded-xl border border-primary/30 bg-background/60 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Create a note</h3><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-4 w-4" /></button></div><input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" /><textarea value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} placeholder="Write your idea…" rows={5} className="mt-3 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" /><div className="mt-3 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" onClick={() => void create()} disabled={busy || !draft.title.trim() || !draft.content.trim()}>Save note</Button></div></div>}
    {busy && notes.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Loading your notes…</p> : visibleNotes.length === 0 ? <div className="py-10 text-center"><FileText className="mx-auto h-9 w-9 text-muted-foreground" /><p className="mt-3 font-medium">No notes yet</p><p className="mt-1 text-sm text-muted-foreground">Create your first note and make the idea permanent.</p></div> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleNotes.map(note => <article key={note.id} className="group rounded-xl border border-border bg-background/40 p-4 transition hover:-translate-y-0.5 hover:border-primary/50"><div className="flex items-start justify-between gap-3"><h3 className="line-clamp-2 font-semibold">{note.title}</h3><Trash2 className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" /></div><p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p><time className="mt-4 block text-xs text-muted-foreground">{new Date(note.updatedAt).toLocaleDateString()}</time></article>)}</div>}
  </section>;
}
