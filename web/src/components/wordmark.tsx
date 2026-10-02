import { LogoIcon } from "./logo-draw";

export function Wordmark({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClass = size === "sm" ? "text-lg" : size === "lg" ? "text-4xl" : "text-2xl";
  return (
    <span className={`inline-flex items-baseline font-display font-black uppercase tracking-tight ${sizeClass} ${className}`}>
      <span className="text-foreground">SAPOK</span>
      <span className="ml-1.5 bg-gradient-to-br from-accent to-primary bg-clip-text normal-case text-transparent">Pay</span>
    </span>
  );
}

/** The icon + wordmark together, as they appear in the real lockup — use this instead of a bare <Wordmark /> wherever there's room. */
export function Logo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const iconPx = size === "sm" ? 24 : size === "lg" ? 44 : 32;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoIcon size={iconPx} className="shrink-0" />
      <Wordmark size={size} />
    </span>
  );
}
