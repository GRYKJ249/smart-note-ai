import { type ReactNode } from "react";
import { localUser } from "@/lib/browser-store";

/**
 * There are no accounts in this app. Everything is stored in the visitor's own
 * browser, so this hook just reports a single local "user" so existing screens
 * keep working.
 */
export type LocalUser = ReturnType<typeof localUser>;

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return { session: null, user: localUser(), loading: false };
}
