/**
 * MedicalIcons.tsx — Focused SVG icon set for Careculator.
 *
 * All icons are 24×24, stroke-based, and use `currentColor` so they
 * inherit Tailwind text colour classes and work in both themes.
 *
 * Usage:
 *   <RecoveryIcon className="text-cf-teal w-4 h-4" />
 *   <CostIcon className="w-5 h-5 text-slate-500" />
 */

interface IconProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Clinic card stats
// ---------------------------------------------------------------------------

/** Calendar — Avg Visits */
export function VisitsIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/** Heart pulse — Recovery Speed */
export function RecoveryIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12h3l2-7 4 14 3-7h3" />
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/** Shield check — Outcome Quality */
export function OutcomeIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Scale / balance — Treatment Burden */
export function BurdenIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v18M3 6l9-3 9 3M6 10l-3 7h6l-3-7zM18 10l-3 7h6l-3-7z" />
    </svg>
  );
}

/** Dollar sign — Cost */
export function CostIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

/** Target / bullseye — Match Score */
export function MatchIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

/** Map pin — Distance */
export function DistanceIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status badge icons
// ---------------------------------------------------------------------------

/** Lightning bolt — Fast */
export function FastIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

/** Checkmark circle — Low / Good */
export function GoodIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Warning triangle — High / Bad */
export function WarnIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

/** Minus circle — Moderate / Neutral */
export function ModerateIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
    </svg>
  );
}

/** Trophy — Best Value */
export function TrophyIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4H4a2 2 0 0 0-2 2v1c0 3.31 2.69 6 6 6h8c3.31 0 6-2.69 6-6V6a2 2 0 0 0-2-2h-3" />
      <rect x="7" y="2" width="10" height="12" rx="2" />
    </svg>
  );
}

/** Star — Top Recommendation */
export function StarIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Specialty icons
// ---------------------------------------------------------------------------

/** Stethoscope — Primary Care / Urgent Care */
export function StethoscopeIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  );
}

/** Tooth — Dental */
export function ToothIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5.5C10 3 7 3 5.5 4.5S3 9 4 11c1 2 1 3 1 5s.5 4 2 4 2-2 2-4c0-1 .5-2 3-2s3 1 3 2c0 2 .5 4 2 4s2-2 2-4 0-3 1-5c1-2 1-5-.5-6.5S14 3 12 5.5z" />
    </svg>
  );
}

/** Brain — Behavioral / Mental Health */
export function BrainIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66z" />
    </svg>
  );
}

/** Female symbol — Women's Health / OB-GYN */
export function WomensHealthIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="5" />
      <path d="M12 13v8M9 18h6" />
    </svg>
  );
}

/** Eye — Vision / Optometry */
export function EyeIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Pill — Pharmacy */
export function PillIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7.07-7.07l7 7a5 5 0 1 1-7.07 7.07z" />
      <path d="M8.5 8.5l7 7" />
    </svg>
  );
}

/** Child/Pediatrics */
export function PediatricsIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="6" r="3" />
      <path d="M9 20v-4a3 3 0 1 1 6 0v4" />
      <path d="M6 20h12" />
    </svg>
  );
}

/** Substance / drop — Substance Abuse Treatment */
export function SubstanceIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v6l3 3-3 3v6" />
      <path d="M9 8H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3" />
      <path d="M15 8h3a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Specialty → Icon mapping (used in clinic cards)
// ---------------------------------------------------------------------------

/** Map a specialty string to its icon component. */
export function SpecialtyIcon({ specialty, className = '' }: { specialty: string; className?: string }) {
  const s = specialty.toLowerCase();
  if (s.includes('dental'))                    return <ToothIcon className={className} />;
  if (s.includes('behavioral') || s.includes('mental')) return <BrainIcon className={className} />;
  if (s.includes('women') || s.includes('ob')) return <WomensHealthIcon className={className} />;
  if (s.includes('vision') || s.includes('optom')) return <EyeIcon className={className} />;
  if (s.includes('pharmacy') || s.includes('pharma')) return <PillIcon className={className} />;
  if (s.includes('pediatric') || s.includes('child')) return <PediatricsIcon className={className} />;
  if (s.includes('substance') || s.includes('addiction')) return <SubstanceIcon className={className} />;
  // Default: stethoscope for primary/urgent care
  return <StethoscopeIcon className={className} />;
}
