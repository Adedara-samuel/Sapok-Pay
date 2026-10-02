"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { SplashScreen } from "@/components/splash-screen";
import { useAuthHydration } from "@/lib/use-auth-hydration";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const hydrated = useAuthHydration();
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SplashScreen ready={hydrated}>{children}</SplashScreen>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
