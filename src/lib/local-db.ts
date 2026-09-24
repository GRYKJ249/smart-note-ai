/**
 * Local data layer — everything lives in the visitor's own browser.
 *
 * Rows (threads, messages, generated images, workspace files, profile) are kept
 * in localStorage; image bytes live in IndexedDB (see browser-store.ts).
 * There are no accounts and nothing is sent to a database.
 */

import { getFile, putFile, readTable, removeFiles, writeTable, type Row } from "@/lib/browser-store";
import type { FileUIPart } from "ai";

export { getFile, putFile, removeFiles };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const now = () => new Date().toISOString();

/* --------------------------------- threads -------------------------------- */

export type Thread = { id: string; title: string; created_at: string; updated_at: string };

export function listThreads(): Thread[] {
  return (readTable("chat_threads") as unknown as Thread[])
    .slice()
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export function createThread(title: string): Thread {
  const thread: Thread = { id: uid(), title: title.slice(0, 80) || "New chat", created_at: now(), updated_at: now() };
  writeTable("chat_threads", [thread as unknown as Row, ...(readTable("chat_threads") as Row[])]);
  return thread;
}

export function getThread(id: string): Thread | null {
  return listThreads().find((thread) => thread.id === id) ?? null;
}

export function updateThread(id: string, patch: Partial<Thread>) {
  writeTable(
    "chat_threads",
    (readTable("chat_threads") as Row[]).map((row) =>
      row.id === id ? ({ ...row, ...patch, updated_at: now() } as Row) : row,
    ),
  );
}

export function deleteThread(id: string) {
  writeTable("chat_threads", (readTable("chat_threads") as Row[]).filter((row) => row.id !== id));
  const messages = readTable("chat_messages") as unknown as Message[];
  const paths = messages.filter((m) => m.thread_id === id && m.image_url).map((m) => m.image_url!);
  writeTable("chat_messages", messages.filter((m) => m.thread_id !== id) as unknown as Row[]);
  if (paths.length) void removeFiles(paths);
}

/* -------------------------------- messages -------------------------------- */

export type Message = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string | null;
  files?: FileUIPart[];
  created_at: string;
};

export function listMessages(threadId: string): Message[] {
  return (readTable("chat_messages") as unknown as Message[])
    .filter((message) => message.thread_id === threadId)
    .sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
}

export function addMessage(input: {
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string | null;
  files?: FileUIPart[];
}): Message {
  const message: Message = { id: uid(), created_at: now(), image_url: null, ...input };
  writeTable("chat_messages", [...(readTable("chat_messages") as Row[]), message as unknown as Row]);
  updateThread(input.thread_id, {});
  return message;
}

/* ---------------------------- generated images ---------------------------- */

export type GeneratedImage = { id: string; prompt: string; path: string; created_at: string };

export function listImages(): GeneratedImage[] {
  return (readTable("generated_images") as unknown as GeneratedImage[])
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function addImage(prompt: string, path: string): GeneratedImage {
  const image: GeneratedImage = { id: uid(), prompt, path, created_at: now() };
  writeTable("generated_images", [image as unknown as Row, ...(readTable("generated_images") as Row[])]);
  return image;
}

export function deleteImage(id: string) {
  const images = listImages();
  const target = images.find((image) => image.id === id);
  writeTable("generated_images", images.filter((image) => image.id !== id) as unknown as Row[]);
  if (target) void removeFiles([target.path]);
}

/** Save a data URL into browser storage and return its local path. */
export async function saveImageData(dataUrl: string, prompt: string): Promise<GeneratedImage> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `images/${uid()}.png`;
  await putFile(path, blob);
  return addImage(prompt, path);
}

/* ---------------------------- workspace files ----------------------------- */

export type WorkspaceFile = { id: string; path: string; content: string; updated_at: string };

export function listWorkspaceFiles(): WorkspaceFile[] {
  return (readTable("workspace_files") as unknown as WorkspaceFile[])
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function upsertWorkspaceFiles(files: { path: string; content: string }[]) {
  const rows = listWorkspaceFiles();
  for (const file of files) {
    const existing = rows.find((row) => row.path === file.path);
    if (existing) {
      existing.content = file.content;
      existing.updated_at = now();
    } else {
      rows.push({ id: uid(), path: file.path, content: file.content, updated_at: now() });
    }
  }
  writeTable("workspace_files", rows as unknown as Row[]);
}

export function deleteWorkspaceFile(path: string) {
  writeTable("workspace_files", listWorkspaceFiles().filter((row) => row.path !== path) as unknown as Row[]);
}

export function renameWorkspaceFile(from: string, to: string) {
  writeTable(
    "workspace_files",
    listWorkspaceFiles().map((row) =>
      row.path === from ? { ...row, path: to, updated_at: now() } : row,
    ) as unknown as Row[],
  );
}

/* --------------------------------- profile -------------------------------- */

export type LocalProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

const PROFILE_ID = "local-profile";

export function getLocalProfile(): LocalProfile {
  const stored = (readTable("profiles") as unknown as LocalProfile[])[0];
  return (
    stored ?? {
      id: PROFILE_ID,
      username: null,
      display_name: null,
      avatar_url: null,
      created_at: now(),
    }
  );
}

export function saveLocalProfile(patch: Partial<LocalProfile>): LocalProfile {
  const next = { ...getLocalProfile(), ...patch, id: PROFILE_ID };
  writeTable("profiles", [next as unknown as Row]);
  return next;
}
