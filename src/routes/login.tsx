import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, UserRound, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch(register ? "/api/auth/register" : "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to continue");
      await refresh();
      toast.success(register ? "Account created" : "Welcome back");
      await navigate({ to: "/chat" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to continue"); }
    finally { setBusy(false); }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-aurora bg-grid px-4 py-10">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_35%),radial-gradient(circle_at_80%_80%,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_35%)]" />
    <section className="glass-strong relative w-full max-w-md rounded-3xl p-8 shadow-glow-lg sm:p-10">
      <div className="mb-8 text-center"><OperaLogoMark className="mx-auto h-20 w-20" label="Smart Note AI" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-primary">Smart Note AI</p><h1 className="mt-3 text-3xl font-bold">{register ? "Create your workspace" : "Welcome back"}</h1><p className="mt-2 text-sm text-muted-foreground">{register ? "Your ideas, synced and secure." : "Continue where your thoughts left off."}</p></div>
      <form onSubmit={submit} className="space-y-4">
        {register && <label className="block"><span className="mb-1.5 block text-sm font-medium">Name</span><div className="relative"><UserRound className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><input required minLength={2} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border bg-background/50 py-3 ps-10 pe-3 outline-none focus:border-primary" placeholder="Your name" /></div></label>}
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Email</span><div className="relative"><Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border bg-background/50 py-3 ps-10 pe-3 outline-none focus:border-primary" placeholder="you@example.com" /></div></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Password</span><div className="relative"><LockKeyhole className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><input required minLength={register ? 8 : 1} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border bg-background/50 py-3 ps-10 pe-3 outline-none focus:border-primary" placeholder="••••••••" /></div></label>
        <Button disabled={busy} className="h-12 w-full rounded-xl text-base"><Sparkles className="h-4 w-4" />{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">{register ? "Already have an account?" : "New to Smart Note AI?"} <button type="button" onClick={() => setRegister(!register)} className="font-semibold text-primary hover:underline">{register ? "Sign in" : "Create an account"}</button></p>
      <Link to="/" className="mt-5 block text-center text-xs text-muted-foreground hover:text-foreground">Back to home</Link>
    </section>
  </main>;
}
