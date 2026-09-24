import { useQuery } from "@tanstack/react-query";
import { getFile } from "@/lib/browser-store";
import { getLocalProfile, saveLocalProfile, type LocalProfile } from "@/lib/local-db";

export type Profile = LocalProfile & { tokens_used?: number | null };

/** Avatars are stored in this browser; turn a stored path into something <img> can show. */
export async function resolveAvatarUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/.test(value)) return value;
  return await getFile(value);
}

export function isPlaceholderUsername(username: string | null | undefined): boolean {
  return !username || /^\d+$/.test(username);
}

export { saveLocalProfile };

export function useProfile() {
  const query = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const profile = getLocalProfile();
      return { profile, avatarUrl: await resolveAvatarUrl(profile.avatar_url) };
    },
    staleTime: 10_000,
  });

  const profile = query.data?.profile ?? null;
  const username = isPlaceholderUsername(profile?.username) ? null : (profile?.username ?? null);

  return {
    profile,
    username,
    displayName:
      profile?.display_name && !/^\d+$/.test(profile.display_name) ? profile.display_name : "",
    avatarUrl: query.data?.avatarUrl ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
