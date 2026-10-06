"use client";

import { useEffect, useState } from "react";

function timeAgo(ms: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

/** A pulsing dot + a self-updating "Xs ago" label — the visible proof a page is actually polling live data, not a static snapshot. */
export function LiveIndicator({ lastUpdated }: { lastUpdated: number | undefined }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      Live{lastUpdated ? ` · updated ${timeAgo(lastUpdated)}` : ""}
    </span>
  );
}
