"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, Mail, UserPlus } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { MutedText } from "@/components/ui";

const ICON = { CONTACT_SUBMISSION: Mail, ORGANIZATION_CREATED: UserPlus } as const;

/** Polls every 10s — the closest thing to real-time without standing up a WebSocket/SSE server this project doesn't have. */
export function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const feedQuery = useQuery({ queryKey: ["admin-notifications"], queryFn: () => apiClient.admin.getNotifications(), refetchInterval: 10_000 });
  const feed = feedQuery.data;

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4.5 w-4.5" />
        {!!feed?.unreadCount && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {feed.unreadCount > 9 ? "9+" : feed.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 animate-scale-in overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-foreground">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {feedQuery.isLoading && (
              <div className="p-4">
                <MutedText>Loading…</MutedText>
              </div>
            )}
            {feed?.notifications.length === 0 && (
              <div className="p-4">
                <MutedText>Nothing new in the last 24 hours.</MutedText>
              </div>
            )}
            {feed?.notifications.map((n) => {
              const Icon = ICON[n.kind];
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 border-b border-border px-4 py-3 text-sm transition-colors last:border-0 hover:bg-muted"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-foreground">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
