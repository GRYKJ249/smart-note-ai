import { putFile } from "@/lib/browser-store";
import { resolveAvatarUrl } from "@/hooks/useProfile";

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export type AvatarUploadResult =
  | { ok: true; path: string; url: string | null }
  | { ok: false; error: "not_image" | "too_large" | "upload_failed"; message?: string };

/** Store an avatar inside this browser and return its local path. */
export async function uploadAvatar(file: File): Promise<AvatarUploadResult> {
  if (!file.type.startsWith("image/")) return { ok: false, error: "not_image" };
  if (file.size > MAX_AVATAR_BYTES) return { ok: false, error: "too_large" };

  const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `avatars/avatar-${Date.now()}.${extension}`;
  try {
    await putFile(path, file);
  } catch (error) {
    return { ok: false, error: "upload_failed", message: (error as Error)?.message };
  }

  return { ok: true, path, url: await resolveAvatarUrl(path) };
}
