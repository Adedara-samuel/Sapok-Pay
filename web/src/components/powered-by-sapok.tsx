/** The parent-company credit — the same small badge SAPOK AI and Sapok OneGrid carry. */
export function PoweredBySapok({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <span>Powered by</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/sapok-icon.png" alt="" className="h-3.5 w-3.5 object-contain" />
      <span className="font-semibold tracking-wide text-foreground">SAPOK</span>
    </div>
  );
}
