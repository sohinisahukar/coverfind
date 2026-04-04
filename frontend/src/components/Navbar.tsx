import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/5 backdrop-blur-sm relative">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-white font-semibold text-lg tracking-tight">Careculator</span>
      </Link>

      {/* Desktop links */}
      <div className="hidden sm:flex items-center gap-6 md:gap-8">
        <Link to="/" className="text-white/60 hover:text-white text-sm transition-colors">How it Works</Link>
        <Link to="/" className="text-white/60 hover:text-white text-sm transition-colors">About</Link>
        <button
          onClick={() => navigate('/results')}
          className="border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          Try Demo
        </button>
      </div>

      {/* Mobile hamburger */}
      <button
        className="sm:hidden text-white/60 hover:text-white p-1"
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          {menuOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 z-50 glass-card rounded-none border-t border-white/5 flex flex-col p-4 gap-3 sm:hidden">
          <Link to="/" onClick={() => setMenuOpen(false)} className="text-white/60 hover:text-white text-sm py-1">How it Works</Link>
          <Link to="/" onClick={() => setMenuOpen(false)} className="text-white/60 hover:text-white text-sm py-1">About</Link>
          <button onClick={() => { navigate('/results'); setMenuOpen(false); }} className="btn-primary text-sm py-2 w-full">
            Try Demo
          </button>
        </div>
      )}
    </nav>
  );
}
