"use client";

import { useId, useMemo, useState } from "react";
import type { TransactionSeriesPoint } from "@/lib/types";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

const WIDTH = 720;
const HEIGHT = 220;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

/**
 * A hand-rolled SVG line chart — no charting library needed for one series.
 * Ships its own hover layer (crosshair + tooltip) since an interactive
 * chart with no way to read exact values isn't a finished chart.
 */
export function TransactionChart({ points }: { points: TransactionSeriesPoint[] }) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { linePath, areaPath, coords, maxValue } = useMemo(() => {
    const values = points.map((p) => p.totalMinor);
    const max = Math.max(1, ...values);
    const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

    const coords = points.map((p, i) => ({
      x: PAD_LEFT + i * step,
      y: PAD_TOP + innerHeight - (p.totalMinor / max) * innerHeight,
      point: p,
    }));

    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
    const area = coords.length > 0 ? `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${HEIGHT - PAD_BOTTOM} L ${coords[0].x.toFixed(1)} ${HEIGHT - PAD_BOTTOM} Z` : "";

    return { linePath: line, areaPath: area, coords, maxValue: max };
  }, [points]);

  if (points.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No transactions in this period yet.</div>;
  }

  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="relative min-w-0 w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full min-w-0" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Transaction volume over time">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((fraction) => {
          const y = PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * fraction;
          return <line key={fraction} x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y} y2={y} stroke="hsl(var(--border))" strokeWidth={1} />;
        })}

        <text x={4} y={PAD_TOP + 4} className="fill-muted-foreground text-[9px]">
          {naira(maxValue)}
        </text>
        <text x={4} y={HEIGHT - PAD_BOTTOM} className="fill-muted-foreground text-[9px]">
          ₦0
        </text>

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hovered && (
          <>
            <line x1={hovered.x} x2={hovered.x} y1={PAD_TOP} y2={HEIGHT - PAD_BOTTOM} stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill="hsl(var(--primary))" stroke="hsl(var(--surface))" strokeWidth={2} />
          </>
        )}

        {coords.map((c, i) => (
          <rect
            key={c.point.date}
            x={PAD_LEFT + (i - 0.5) * (coords.length > 1 ? (WIDTH - PAD_LEFT - PAD_RIGHT) / (coords.length - 1) : WIDTH)}
            y={0}
            width={coords.length > 1 ? (WIDTH - PAD_LEFT - PAD_RIGHT) / (coords.length - 1) : WIDTH}
            height={HEIGHT}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex((current) => (current === i ? null : current))}
          />
        ))}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-card"
          style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: `${(hovered.y / HEIGHT) * 100}%` }}
        >
          <p className="font-semibold text-foreground">{naira(hovered.point.totalMinor)}</p>
          <p className="text-muted-foreground">
            {new Date(hovered.point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {hovered.point.count} txn
            {hovered.point.count === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
