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
  status: Status;
  label?: string;
}

const config: Record<Status, { className: string; icon: string }> = {
  fast:       { className: 'badge-green', icon: '⚡' },
  slow:       { className: 'badge-red', icon: '🔴' },
  moderate:   { className: 'badge-amber', icon: '🟡' },
  medium:     { className: 'badge-amber', icon: '🟡' },
  high:       { className: 'badge-red', icon: '⚠' },
  low:        { className: 'badge-green', icon: '✅' },
  'best-value': { className: 'badge-teal', icon: '🏆' },
  'high-visits': { className: 'badge-amber', icon: '⚠' },
  'top-rec':  { className: 'badge-teal', icon: '✅' },
  new:        { className: 'badge-teal', icon: '' },
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

export default function StatusBadge({ status, label }: Props) {
  const { className, icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {icon && <span className="text-xs">{icon}</span>}
      {label ?? labels[status]}
    </span>
  );
}
