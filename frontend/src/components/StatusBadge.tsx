/**
 * StatusBadge.tsx — Coloured pill badge for categorical values.
 *
 * Maps status strings (from the API) to colour classes and SVG icons.
 * Semantics: "high" = bad (red), "low" = good (green) — correct for
 * treatment burden, per-visit cost tier, etc.
 *
 * IMPORTANT: For outcome quality, "high" is GOOD. Use the dedicated
 * OutcomeQualityBadge in ComparePage instead of this component.
 */

import { FastIcon, GoodIcon, WarnIcon, ModerateIcon, TrophyIcon, StarIcon } from './MedicalIcons';

type Status =
  | 'fast'
  | 'slow'
  | 'moderate'
  | 'medium'
  | 'high'
  | 'low'
  | 'best-value'
  | 'high-visits'
  | 'top-rec'
  | 'new';

interface Props {
  /** API-driven values may not match the preset union; unknown → moderate */
  status: string;
  label?: string;
}

const config: Record<Status, { className: string; Icon: React.FC<{ className?: string }> | null }> = {
  fast:          { className: 'badge-green', Icon: FastIcon },
  slow:          { className: 'badge-red',   Icon: WarnIcon },
  moderate:      { className: 'badge-amber', Icon: ModerateIcon },
  medium:        { className: 'badge-amber', Icon: ModerateIcon },
  high:          { className: 'badge-red',   Icon: WarnIcon },
  low:           { className: 'badge-green', Icon: GoodIcon },
  'best-value':  { className: 'badge-teal',  Icon: TrophyIcon },
  'high-visits': { className: 'badge-amber', Icon: WarnIcon },
  'top-rec':     { className: 'badge-teal',  Icon: StarIcon },
  new:           { className: 'badge-teal',  Icon: null },
};

const labels: Record<Status, string> = {
  fast: 'Fast',
  slow: 'Slow',
  moderate: 'Moderate',
  medium: 'Medium',
  high: 'High',
  low: 'Low',
  'best-value': 'Best Value',
  'high-visits': 'High Visits',
  'top-rec': 'Top Rec',
  new: 'NEW',
};

function resolveStatus(status: string): Status {
  if (Object.prototype.hasOwnProperty.call(config, status)) return status as Status;
  return 'moderate';
}

export default function StatusBadge({ status, label }: Props) {
  const key = resolveStatus(status);
  const { className, Icon } = config[key];
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {label ?? labels[key]}
    </span>
  );
}
