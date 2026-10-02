import { useEffect, useState } from "react";
import { useAuthStore } from "./auth-store";

/**
 * True once zustand's persist middleware has finished reading localStorage
 * — the splash screen waits on this so it never flashes a logged-out state
 * for an already-signed-in user. Must default to false and only touch
 * `useAuthStore.persist` inside an effect — Next.js renders this once
 * before hydration, and `persist` isn't safe to call outside the browser.
 */
export function useAuthHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsubscribe;
  }, []);

  return hydrated;
}
