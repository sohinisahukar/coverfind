/**
 * Navbar.tsx — Top navigation bar with logo, theme toggle, and mobile menu.
 */

import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import LogoMark from './LogoMark';
import bulbLight from '../assets/light-bulb-icon.svg';
import bulbDark from '../assets/light-bulb-icon-black.svg';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <nav className="surface-nav flex items-center justify-between px-4 sm:px-8 py-4 relative overflow-visible">
      <Link to="/" className="flex items-center gap-2.5 shrink-0 rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-cf-teal dark:ring-offset-slate-950" aria-label="Careculator home">
        <LogoMark size={34} />
        <span className="text-ink font-semibold text-lg tracking-tight">Careculator</span>
      </Link>

      {/* Desktop nav links — only render when not colliding with hanging bulb */}
      <div className={`hidden sm:flex items-center gap-5 ${isHome ? 'mr-24' : ''}`}>
        <NavLink to="/how-it-works" className={({ isActive }) => `text-sm transition-colors whitespace-nowrap ${isActive ? 'text-cf-teal font-medium' : 'text-ink-muted hover:text-ink'}`}>How it works</NavLink>
        <NavLink to="/about-estimates" className={({ isActive }) => `text-sm transition-colors whitespace-nowrap ${isActive ? 'text-cf-teal font-medium' : 'text-ink-muted hover:text-ink'}`}>About estimates</NavLink>
        <button
          type="button"
          className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-1.5 text-sm font-medium text-ink hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          Sign in
        </button>
      </div>

      {/* Hanging bulb — only on homepage, desktop */}
      {isHome && (
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="absolute right-8 top-0 hidden sm:flex flex-col items-center group z-20"
        >
          <div className="w-px h-20 bg-slate-400/50 dark:bg-slate-500/50 group-hover:bg-cf-teal/60 transition-colors" />
          <img
            src={theme === 'dark' ? bulbLight : bulbDark}
            alt=""
            className="w-14 h-14 drop-shadow-xl group-hover:scale-110 transition-transform duration-200"
          />
        </button>
      )}

      {/* Mobile: inline bulb (home only) + hamburger */}
      <div className="flex items-center gap-2 sm:hidden">
        {isHome && (
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center justify-center w-9 h-9"
          >
            <img src={theme === 'dark' ? bulbLight : bulbDark} alt="" className="w-7 h-7" />
          </button>
        )}
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
          <Link to="/how-it-works" onClick={() => setMenuOpen(false)} className="text-sm text-ink-muted text-center py-1 hover:text-ink transition-colors">How it works</Link>
          <Link to="/about-estimates" onClick={() => setMenuOpen(false)} className="text-sm text-ink-muted text-center py-1 hover:text-ink transition-colors">About estimates</Link>
          <Link to="/results" onClick={() => setMenuOpen(false)} className="btn-primary text-sm py-2 w-full text-center">
            Browse All
          </Link>
        </div>
      )}
    </nav>
  );
}
