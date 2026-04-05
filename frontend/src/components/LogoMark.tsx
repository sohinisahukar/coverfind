/**
 * LogoMark.tsx — Careculator brand logo (heart + medical cross).
 *
 * Two modes:
 *   animated={false}  — filled static version for the navbar
 *   animated={true}   — stroke-based draw-in version for the splash screen
 *
 * viewBox 0 0 100 100. All coordinates hand-tuned to match the brand logo.
 */

interface Props {
  size?: number;
  animated?: boolean;
  className?: string;
}

// ── Outer silhouette ────────────────────────────────────────────────────────
// Traces the complete perimeter of the filled logo shape (clockwise).
const OUTER = `
  M 50 24
  C 54 16 70 10 80 18
  C 92 26 94 44 84 56
  L 84 62 L 88 62 L 88 72 L 76 72
  L 76 82
  L 66 94 L 58 82
  L 50 90
  L 42 82 L 34 94
  L 24 82 L 24 72
  L 12 72 L 12 62 L 16 62
  L 16 56
  C 6 44 8 26 20 18
  C 30 10 46 16 50 24
  Z
`.trim();

// ── Inner C-arc ──────────────────────────────────────────────────────────────
// The circular cutout inside the left lobe (open on the right = C shape).
const INNER_C = `M 43 22 A 15 15 0 1 0 43 58`.trim();

// ── Cross connector ──────────────────────────────────────────────────────────
// Horizontal cross bar visible between the two lobes.
const CROSS_BAR = `M 24 62 L 76 62`.trim();

// ── Total path lengths (approximate) for stroke-dasharray animation ──────────
// Calculated from path geometry; keeps animation smooth without JS measurement.
const DASH = {
  outer: 380,
  innerC: 95,
  crossBar: 52,
};

export default function LogoMark({ size = 40, animated = false, className = '' }: Props) {
  const color = '#e0134f'; // brand crimson

  if (!animated) {
    // ── Static filled version (navbar) ──────────────────────────────────────
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        aria-label="Careculator logo"
        role="img"
      >
        {/* Filled outer silhouette */}
        <path d={OUTER} fill={color} />
        {/* White inner circle cutout (left lobe) */}
        <circle cx="43" cy="40" r="15" fill="white" />
        {/* Restore the thin C-ring by covering most of the circle */}
        <circle cx="43" cy="40" r="9" fill={color} />
        {/* White cross cutout between lobes */}
        <rect x="43" y="28" width="14" height="30" fill="white" />
        {/* White horizontal cross bar shows through */}
        <rect x="24" y="57" width="52" height="10" fill="white" />
      </svg>
    );
  }

  // ── Animated stroke draw-in version (splash) ─────────────────────────────
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-label="Careculator logo animation"
      role="img"
    >
      {/* 1. Outer heart+cross silhouette — draws first */}
      <path
        d={OUTER}
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={DASH.outer}
        strokeDashoffset={DASH.outer}
        className="logo-draw-outer"
      />

      {/* 2. Inner C-arc — draws second */}
      <path
        d={INNER_C}
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={DASH.innerC}
        strokeDashoffset={DASH.innerC}
        className="logo-draw-inner"
      />

      {/* 3. Cross bar — draws last */}
      <path
        d={CROSS_BAR}
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={DASH.crossBar}
        strokeDashoffset={DASH.crossBar}
        className="logo-draw-bar"
      />
    </svg>
  );
}
