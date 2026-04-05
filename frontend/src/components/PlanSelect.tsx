import { useEffect, useId, useRef, useState } from 'react';
import type { InsurancePolicy } from '../lib/api';

type Props = {
  label: string;
  policies: InsurancePolicy[];
  value: string | null;
  onSelect: (policyId: string) => void;
  placeholder?: string;
};

/**
 * Themed plan picker — native &lt;select&gt; menus can’t be styled; matches glass + brand UI.
 */
export default function PlanSelect({
  label,
  policies,
  value,
  onSelect,
  placeholder = 'Choose a plan…',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnId = useId();
  const listId = `${btnId}-list`;

  const selected = policies.find(p => p.id === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={rootRef} className="space-y-2">
      <span id={`${btnId}-label`} className="block text-xs font-semibold text-ink">
        {label}
      </span>
      <div className="relative">
        <button
          id={btnId}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${btnId}-label`}
          onClick={() => setOpen(o => !o)}
          className={`plan-select-trigger flex min-h-[2.875rem] w-full items-center justify-between gap-2 rounded-xl border-2 bg-white px-4 py-2.5 pr-10 text-left text-sm transition-[border-color,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 dark:bg-slate-950 dark:focus-visible:ring-violet-400/30 ${
            open
              ? 'border-violet-500 shadow-sm shadow-violet-900/10 dark:border-violet-400/75 dark:shadow-violet-950/30'
              : 'border-slate-200 focus-visible:border-violet-500 dark:border-slate-600 dark:focus-visible:border-violet-400'
          }`}
        >
          <span className={selected ? 'truncate text-ink' : 'truncate text-muted'}>
            {selected ? `${selected.name} · ${selected.type}` : placeholder}
          </span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`pointer-events-none absolute right-3 top-1/2 shrink-0 -translate-y-1/2 text-slate-500 transition-transform dark:text-slate-400 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={`${btnId}-label`}
            className="absolute z-50 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-slate-200/95 bg-white/98 py-1 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-md dark:border-slate-600/90 dark:bg-slate-900/98 dark:shadow-black/50 dark:ring-white/10"
          >
            {policies.map(pol => {
              const isSel = pol.id === value;
              return (
                <li key={pol.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className={`w-full border-b border-slate-100 px-4 py-2.5 text-left transition-colors last:border-b-0 dark:border-slate-700/80 ${
                      isSel
                        ? 'bg-violet-50/90 dark:bg-violet-950/45'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                    onClick={() => {
                      onSelect(pol.id);
                      setOpen(false);
                    }}
                  >
                    <span className="block text-sm font-medium text-ink">{pol.name}</span>
                    <span className="text-xs text-muted">{pol.type}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
