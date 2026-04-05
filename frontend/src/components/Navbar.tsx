/**
 * Navbar.tsx — Top navigation bar with logo, theme toggle, and mobile menu.
 *
 * - Desktop: shows dark/light toggle + "Try Demo" button inline.
 * - Mobile:  collapses into a hamburger menu; theme toggle stays visible.
 * - "Try Demo" navigates to /results with no search params (shows all clinics).
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="surface-nav flex items-center justify-between px-4 sm:px-8 py-4 relative">
      <Link to="/" className="flex items-center gap-2.5 shrink-0 rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-cf-teal dark:ring-offset-slate-950" aria-label="Careculator home">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cf-teal to-cf-blue flex items-center justify-center overflow-hidden shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-ink font-semibold text-lg tracking-tight">Careculator</span>
      </Link>

      <div className="hidden sm:flex items-center gap-5 md:gap-7">
        <div
          className="flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-900/80"
          role="group"
          aria-label="Theme"
        >
          <button
            type="button"
            onClick={() => theme !== 'dark' && toggleTheme()}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-slate-900 text-white shadow-sm dark:bg-sky-500/90 dark:text-white'
                : 'text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            aria-pressed={theme === 'dark'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Dark
          </button>
          <button
            type="button"
            onClick={() => theme !== 'light' && toggleTheme()}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900'
                : 'text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            aria-pressed={theme === 'light'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Light
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/results')}
          className="border border-slate-300 text-ink text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors dark:border-slate-600 dark:hover:bg-slate-800/80"
        >
          Try Demo
        </button>
      </div>

      <div className="flex items-center gap-2 sm:hidden">
        <div className="flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-600 bg-slate-100/90 dark:bg-slate-900/80" role="group" aria-label="Theme">
          <button
            type="button"
            onClick={() => theme !== 'dark' && toggleTheme()}
            className={`rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${
              theme === 'dark' ? 'bg-slate-900 text-white dark:bg-sky-500/90' : 'text-ink-muted'
            }`}
            aria-pressed={theme === 'dark'}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => theme !== 'light' && toggleTheme()}
            className={`rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${
              theme === 'light' ? 'bg-white text-slate-900 dark:bg-slate-100' : 'text-ink-muted'
            }`}
            aria-pressed={theme === 'light'}
          >
            Light
          </button>
        </div>
        <button
          type="button"
          className="text-ink-muted hover:text-ink p-1"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="absolute top-full left-0 right-0 z-50 glass-card rounded-none border-t border-slate-200 dark:border-slate-700 flex flex-col p-4 gap-3 sm:hidden">
          <button type="button" onClick={() => { navigate('/results'); setMenuOpen(false); }} className="btn-primary text-sm py-2 w-full">
            Try Demo
          </button>
        </div>
      )}
    </nav>
  );
}
