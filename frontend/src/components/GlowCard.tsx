import type { ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Permanent teal border-glow wrapper (reactbits-style mask-composite technique).
 * No interaction needed — the gradient border is always visible.
 */
export default function GlowCard({ children, className = '' }: GlowCardProps) {
  return (
    <div className={`glow-card-wrapper ${className}`}>
      {children}
    </div>
  );
}
