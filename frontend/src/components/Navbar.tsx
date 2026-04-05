/**
 * Navbar.tsx — Top navigation bar with logo, theme toggle, and mobile menu.
 *
 * - Desktop: shows dark/light toggle + "Try Demo" button inline.
 * - Mobile:  collapses into a hamburger menu; theme toggle stays visible.
 * - "Try Demo" navigates to /results with no search params (shows all clinics).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import bulbLight from '../assets/light-bulb-icon.svg';
import bulbDark from '../assets/light-bulb-icon-black.svg';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="surface-nav flex items-center justify-between px-4 sm:px-8 py-4 relative overflow-visible">
      <Link to="/" className="flex items-center gap-2.5 shrink-0 rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-cf-teal dark:ring-offset-slate-950" aria-label="Careculator home">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cf-teal to-cf-blue flex items-center justify-center overflow-hidden shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-ink font-semibold text-lg tracking-tight">Careculator</span>
      </Link>

      {/* Hanging bulb — right side, anchored at top of navbar, hangs into page body */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute right-8 top-0 hidden sm:flex flex-col items-center group z-20"
        style={{ paddingBottom: 0 }}
      >
        {/* Wire from very top of navbar */}
        <div className="w-px h-20 bg-slate-400/50 dark:bg-slate-500/50 group-hover:bg-cf-teal/60 transition-colors" />
        {/* Bulb hangs at bottom of wire, below navbar */}
        <img
          src={theme === 'dark' ? bulbLight : bulbDark}
          alt=""
          className="w-14 h-14 drop-shadow-xl group-hover:scale-110 transition-transform duration-200"
        />
      </button>

      {/* Mobile: inline bulb + hamburger */}
      <div className="flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center justify-center w-9 h-9"
        >
          <img src={theme === 'dark' ? bulbLight : bulbDark} alt="" className="w-7 h-7" />
        </button>
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
          <Link to="/results" onClick={() => setMenuOpen(false)} className="btn-primary text-sm py-2 w-full text-center">
            Browse All
          </Link>
        </div>
      )}
    </nav>
  );
}
