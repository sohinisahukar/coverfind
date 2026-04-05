const SCROLL_ROOT_ID = 'app-scroll-root';

/**
 * Scroll the app shell and any nested overflow regions (e.g. results list) back to top.
 */
export function scrollAppToTop() {
  const main = document.getElementById(SCROLL_ROOT_ID);
  if (!main) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  main.scrollTo({ top: 0, behavior: 'smooth' });

  const nodes = main.querySelectorAll<HTMLElement>('*');
  for (const el of nodes) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 0) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function Footer() {
  return (
    <footer className="surface-footer shrink-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-sm text-ink font-semibold tracking-tight">Careculator</p>
            <p className="text-[11px] sm:text-xs text-ink-muted leading-relaxed max-w-prose">
              Demo only — not medical advice. Illustrative estimates; confirm coverage and care with your insurer
              and licensed providers.
            </p>
          </div>
          <div className="flex sm:flex-col sm:items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollAppToTop()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-xs font-medium text-ink shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/60 dark:hover:bg-slate-800"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Back to top
            </button>
          </div>
        </div>
        <p className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} Careculator
        </p>
      </div>
    </footer>
  );
}
