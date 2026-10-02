"use client";

import { create } from "zustand";
import { useEffect } from "react";

type ToastVariant = "info" | "success" | "error";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => set((state) => ({ toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }] })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function useToast() {
  const push = useToastStore((state) => state.push);
  return { toast: (input: Omit<ToastItem, "id">) => push(input) };
}

const VARIANT_STYLE: Record<ToastVariant, string> = {
  info: "border-border",
  success: "border-success/50",
  error: "border-danger/50",
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`animate-fade-in-up rounded-md border bg-surface p-3 shadow-card ${VARIANT_STYLE[toast.variant]}`}>
      <p className="text-sm font-medium text-foreground">{toast.title}</p>
      {toast.description && <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>}
    </div>
  );
}
