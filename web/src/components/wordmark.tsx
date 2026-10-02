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
  const iconSize = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-11 w-11" : "h-8 w-8";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/sapok-pay-icon.png" alt="" className={`${iconSize} shrink-0 rounded-lg object-contain`} />
      <Wordmark size={size} />
    </span>
  );
}
