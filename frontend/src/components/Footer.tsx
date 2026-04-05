/**
 * Footer.tsx — Site-wide footer with disclaimer and "Back to top" button.
 *
 * The "Back to top" button is hidden on the home page (/) since users
 * don't scroll there. On all other pages it scrolls both the
 * #app-scroll-root container and any nested overflow regions.
 */

import { useLocation } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';

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
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const year = new Date().getFullYear();

  return (
    <footer className="surface-footer shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex flex-nowrap items-center justify-center gap-x-1.5 gap-y-1 overflow-x-auto text-center text-[10px] sm:text-[11px] text-ink-muted leading-snug [scrollbar-width:thin]">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink sm:text-[11px] shrink-0 whitespace-nowrap">
            <Stethoscope className="text-[var(--cf-accent-text)]" size={12} strokeWidth={2} aria-hidden />
            Careculator
          </span>
          <span className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden>
            ·
          </span>
          <span className="whitespace-nowrap shrink-0">
            Demo only — not medical advice. Confirm coverage and care with your insurer and providers.
          </span>
          <span className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden>
            ·
          </span>
          <span className="tabular-nums shrink-0 whitespace-nowrap">© {year}</span>
          {!isHome && (
            <>
              <span className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden>
                ·
              </span>
              <button
                type="button"
                onClick={() => scrollAppToTop()}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300/90 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-ink transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/70 dark:hover:bg-slate-800 shrink-0 whitespace-nowrap"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Back to top
              </button>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
