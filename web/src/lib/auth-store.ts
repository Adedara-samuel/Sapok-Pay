import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccessTokenPayload, AuthTokens } from "./types";

/** Client-side only, for UI gating — never a security boundary, the API enforces auth server-side regardless of what the UI renders. */
function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return JSON.parse(json) as AccessTokenPayload;
  } catch {
    return null;
  }
}

interface AuthState {
  accessToken: string | null;
  scope: "merchant" | "admin" | null;
  setTokens: (tokens: AuthTokens) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      scope: null,
      setTokens: (tokens) => {
        const payload = decodeAccessToken(tokens.accessToken);
        set({ accessToken: tokens.accessToken, scope: payload?.scope ?? null });
      },
      clear: () => set({ accessToken: null, scope: null }),
    }),
    { name: "sapok-pay-auth" },
  ),
);
