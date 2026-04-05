import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { InsurancePolicy } from '../lib/api';

type Props = {
  label: string;
  policies: InsurancePolicy[];
  value: string | null;
  onSelect: (policyId: string) => void;
  placeholder?: string;
};

/**
 * Themed plan picker rendered via a portal so it escapes any parent
 * backdrop-blur / stacking-context that would make it appear transparent.
 */
export default function PlanSelect({
  label,
  policies,
  value,
  onSelect,
  placeholder = 'Choose a plan…',
}: Props) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const btnId = useId();
  const listId = `${btnId}-list`;

  const selected = policies.find(p => p.id === value);

  const updatePosition = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: r.bottom + 6,
        left: r.left,
        width: r.width,
        zIndex: 9999,
      });
    }
  };

  const handleToggle = () => {
    if (!open) updatePosition();
    setOpen(o => !o);
  };

  // Close on outside click (checks both the trigger and the portal list)
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !listRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Reposition if window resizes while open
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open]);

  return (
    <div ref={rootRef} className="space-y-2">
      <span id={`${btnId}-label`} className="block text-xs font-semibold text-ink">
        {label}
      </span>
      <div className="relative">
        <button
          ref={btnRef}
          id={btnId}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${btnId}-label`}
          onClick={handleToggle}
          className={`plan-select-trigger flex w-full min-h-[2.875rem] items-center justify-between gap-2 rounded-xl border-2 bg-white px-4 py-2.5 pr-10 text-left text-sm transition-[border-color,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-cf-teal/25 dark:bg-[#0b1014] dark:focus-visible:ring-teal-500/25 ${
            open
              ? 'border-cf-teal shadow-sm shadow-teal-900/10 dark:border-teal-400/70 dark:shadow-teal-900/20'
              : 'border-slate-200 focus-visible:border-cf-teal dark:border-slate-600 dark:focus-visible:border-teal-400'
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

        {open && createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={`${btnId}-label`}
            style={dropdownStyle}
            className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-2xl ring-1 ring-slate-900/5 dark:border-slate-600 dark:bg-[#0b1014] dark:ring-white/10"
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
                        ? 'bg-teal-50 dark:bg-teal-950/60'
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
          </ul>,
          document.body
        )}
      </div>
    </div>
  );
}
