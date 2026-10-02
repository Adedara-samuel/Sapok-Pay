"use client";

import { useId } from "react";

/**
 * The real SAPOK Pay mark (the "P" ribbon + motion lines), traced from the
 * actual brand artwork into a single vector path — not a hand-drawn
 * approximation. `pathLength="1"` (SVG2) lets the dash animation stay
 * scale-independent regardless of the path's real length.
 *
 * Two layers share the exact same `d`: an outline that "sketches" itself in
 * via stroke-dashoffset, then the real gradient-filled mark fades in
 * underneath once the sketch finishes and settles into a steady pulse.
 */
const LOGO_PATH =
  "M 129 13.516 C 110.975 17.199, 94.584 27.725, 85.743 41.296 C 80.795 48.890, 63.708 85.797, 64.357 87.487 C 64.833 88.728, 80.997 88.972, 180.705 89.240 L 296.500 89.552 303.839 91.804 C 322.516 97.536, 334.555 108.076, 338.147 121.841 L 339.885 128.500 339.942 93.611 L 340 58.721 336.870 53.611 C 323.118 31.156, 302.421 16.894, 278 13.041 C 267.732 11.421, 137.217 11.837, 129 13.516 M 17.500 122.556 C 10.737 126.036, 8.808 133.535, 13.475 138.203 C 16.282 141.009, 37.083 142, 93.212 142 C 120.832 142, 122.082 141.807, 126.667 136.845 C 128.692 134.653, 134 123.818, 134 121.876 C 134 120.146, 20.899 120.807, 17.500 122.556 M 181.634 124.586 C 167.056 128.115, 155.446 137.714, 147.773 152.585 C 145.242 157.488, 131.824 185.575, 117.955 215 C 104.085 244.425, 88.747 276.950, 83.869 287.277 C 75.165 305.705, 73.751 309.935, 76.250 310.066 C 86.985 310.628, 140.594 309.622, 144 308.794 C 160.301 304.829, 172.817 293.594, 181.910 274.762 C 187.793 262.578, 200.382 236.399, 228.440 178 C 248.729 135.771, 249.008 135.241, 253.500 130.296 C 255.767 127.800, 259.233 125.285, 261.500 124.490 C 267.486 122.392, 190.317 122.485, 181.634 124.586 M 339.148 138 C 339.038 139.375, 338.052 142.300, 336.957 144.500 C 335.863 146.700, 335.268 147.600, 335.636 146.500 C 337.590 140.658, 337.311 138, 334.744 138 C 333.383 138, 331.076 138.939, 329.617 140.087 C 326.992 142.151, 326.859 142.156, 316.966 140.494 C 309.290 139.205, 306.241 139.069, 303.838 139.907 C 301.718 140.646, 299.544 140.685, 297.103 140.029 C 290.341 138.211, 280.007 139.157, 280.003 141.595 C 280.001 142.747, 279.052 144.547, 277.894 145.595 C 275.048 148.169, 272 154.335, 272 157.519 C 272 158.948, 270.686 161.778, 269.081 163.809 C 267.476 165.839, 263.784 172.225, 260.878 178 C 257.972 183.775, 254.786 189.573, 253.797 190.885 C 251.370 194.106, 251.523 194.805, 254.750 195.226 C 256.262 195.424, 252.100 195.936, 245.500 196.364 C 227.109 197.557, 229.408 198.003, 252 197.625 C 274.671 197.245, 282.794 195.640, 296.297 188.873 C 317.663 178.165, 340.839 151.918, 339.729 139.684 C 339.520 137.383, 339.259 136.625, 339.148 138 M 0 175.500 L 0 188 48.250 187.978 C 93.667 187.957, 96.748 187.843, 100.729 186.036 C 108.537 182.492, 111.845 171.754, 106.711 166.620 C 103.846 163.755, 88.952 163, 35.340 163 L 0 163 0 175.500 M 30 210.704 C 21.288 213.874, 18.740 226.504, 25.707 231.984 C 29.657 235.091, 75.726 235.074, 80.827 231.964 C 84.761 229.566, 90 219.033, 90 213.522 L 90 210 60.750 210.079 C 44.663 210.122, 30.825 210.404, 30 210.704";

export function LogoDraw({ size = 72, className = "" }: { size?: number; className?: string }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 340 340" className={className} role="img" aria-label="SAPOK Pay">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#00c896" />
        </linearGradient>
      </defs>

      {/* The sketch: traces the real silhouette, then fades out. */}
      <path
        d={LOGO_PATH}
        pathLength={1}
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeDasharray={1}
        style={{ strokeDashoffset: 1, animation: "sapok-sketch 1.1s cubic-bezier(0.65, 0, 0.35, 1) forwards, sapok-sketch-fade 0.4s ease-in 1.1s forwards" }}
      />

      {/* The real mark, revealed once the sketch completes. */}
      <path
        d={LOGO_PATH}
        fill={`url(#${gradientId})`}
        fillRule="evenodd"
        style={{ opacity: 0, animation: "sapok-reveal 0.5s ease-out 1.05s forwards, sapok-pulse 2.2s ease-in-out 1.6s infinite" }}
      />

      <style>{`
        @keyframes sapok-sketch { to { stroke-dashoffset: 0; } }
        @keyframes sapok-sketch-fade { to { opacity: 0; } }
        @keyframes sapok-reveal { to { opacity: 1; } }
        @keyframes sapok-pulse {
          0%, 100% { filter: drop-shadow(0 0 6px hsl(var(--primary) / 0.55)); }
          50% { filter: drop-shadow(0 0 16px hsl(var(--primary) / 0.85)); }
        }
      `}</style>
    </svg>
  );
}

/** The settled mark with no animation — for every spot the logo appears outside the boot splash (nav bars, auth panels, footers). */
export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 340 340" className={className} role="img" aria-label="SAPOK Pay">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#00c896" />
        </linearGradient>
      </defs>
      <path d={LOGO_PATH} fill={`url(#${gradientId})`} fillRule="evenodd" />
    </svg>
  );
}
