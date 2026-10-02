"use client";

import { Building2, Users, Wallet } from "lucide-react";

const NODES = [
  { icon: Building2, label: "Bank", x: 60, y: 200 },
  { icon: Wallet, label: "Wallet", x: 280, y: 80 },
  { icon: Users, label: "Merchant", x: 280, y: 320 },
];

const PATHS = [
  { id: "p1", d: "M 60,200 C 140,140 200,100 280,80" },
  { id: "p2", d: "M 60,200 C 140,260 200,300 280,320" },
  { id: "p3", d: "M 280,80 C 320,170 320,230 280,320" },
];

/**
 * A continuously-looping, never-ending visual: dots travel along the paths
 * between bank/wallet/merchant forever (native SVG <animateMotion>, no
 * scroll or click needed to trigger it), while each node pulses gently out
 * of phase with the others. Built to be glanced at, not interacted with.
 */
export function PaymentFlow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 400" className={className} role="img" aria-label="Money flowing between a bank, a wallet and a merchant">
      <defs>
        <linearGradient id="flow-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="flow-dot">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </radialGradient>
      </defs>

      {PATHS.map((path) => (
        <path key={path.id} id={path.id} d={path.d} fill="none" stroke="url(#flow-line)" strokeWidth={2} strokeDasharray="1 7" strokeLinecap="round" />
      ))}

      {PATHS.map((path, i) => (
        <circle key={`${path.id}-dot`} r={4.5} fill="url(#flow-dot)">
          <animateMotion dur={`${2.6 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.5}s`}>
            <mpath href={`#${path.id}`} />
          </animateMotion>
        </circle>
      ))}

      {NODES.map(({ icon: Icon, label, x, y }, i) => (
        <g key={label} transform={`translate(${x}, ${y})`}>
          <circle r={30} fill="hsl(var(--surface))" stroke="hsl(var(--border))" strokeWidth={1.5} />
          <circle r={30} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} opacity={0}>
            <animate attributeName="r" values="28;42;28" dur="2.8s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.8s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
          </circle>
          <foreignObject x={-11} y={-11} width={22} height={22}>
            <div className="flex h-full w-full items-center justify-center text-primary">
              <Icon className="h-[18px] w-[18px]" />
            </div>
          </foreignObject>
          <text y={48} textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}
