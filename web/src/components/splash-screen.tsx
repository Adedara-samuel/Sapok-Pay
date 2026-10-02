"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LogoDraw } from "./logo-draw";
import { Wordmark } from "./wordmark";

const BOOT_PHRASES = ["Establishing secure connection", "Verifying session", "Loading your wallet"];

/**
 * The boot splash: the mark draws itself (see LogoDraw), the wordmark and
 * tagline stagger in beneath it, a cycling status line carries the "still
 * working" read. Fades out only once `ready` is true AND the minimum
 * duration has elapsed AND its own exit transition has finished, so a fast
 * connection never just flashes it and a slow one never looks frozen.
 */
export function SplashScreen({ ready, minDurationMs = 2200, children }: { ready: boolean; minDurationMs?: number; children: ReactNode }) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [mounted, setMounted] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), minDurationMs);
    return () => clearTimeout(timer);
  }, [minDurationMs]);

  useEffect(() => {
    const interval = setInterval(() => setPhraseIndex((i) => (i + 1) % BOOT_PHRASES.length), 800);
    return () => clearInterval(interval);
  }, []);

  const canHide = ready && minTimeElapsed;

  useEffect(() => {
    if (!canHide) return;
    setExiting(true);
    const timer = setTimeout(() => setMounted(false), 500);
    return () => clearTimeout(timer);
  }, [canHide]);

  return (
    <>
      <div aria-hidden={mounted} className={mounted ? "invisible" : undefined}>
        {children}
      </div>

      {mounted && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background transition-opacity duration-500 ease-out ${
            exiting ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.14),transparent_60%)]" />
          <div className="pointer-events-none absolute -inset-1/4 animate-float bg-[radial-gradient(circle_at_30%_30%,hsl(var(--accent)/0.08),transparent_45%)]" />

          <div className="relative flex flex-col items-center gap-5">
            <LogoDraw size={84} className="animate-fade-in" />

            <div className="flex flex-col items-center gap-1.5 animate-fade-in-up [animation-delay:200ms]">
              <Wordmark size="lg" />
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-muted-foreground">Fast · Secure · Simple</p>
            </div>

            <div className="mt-2 flex flex-col items-center gap-2 animate-fade-in-up [animation-delay:400ms]">
              <div className="relative h-[3px] w-56 overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-y-0 w-1/3 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-accent to-transparent" />
              </div>
              <p className="h-4 text-[0.65rem] font-medium uppercase tracking-[0.25em] text-muted-foreground">{BOOT_PHRASES[phraseIndex]}…</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
