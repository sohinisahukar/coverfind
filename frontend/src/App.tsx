/**
 * App.tsx — Root layout and route definitions.
 *
 * Renders the persistent shell (navbar, footer, animated background)
 * and maps URL paths to page components via react-router-dom.
 *
 * Routes:
 *   /                  -> HomePage     (search wizard)
 *   /results           -> ResultsPage  (clinic search results + filters)
 *   /compare?ids=a,b   -> ComparePage  (side-by-side comparison)
 *   /compare/summary   -> SummaryPage  (card-grid overview)
 */

import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MedMotifBackground from './components/MedMotifBackground';
import LogoSplash from './components/LogoSplash';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import ComparePage from './pages/ComparePage';
import SummaryPage from './pages/SummaryPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutEstimatesPage from './pages/AboutEstimatesPage';

export default function App() {
  const location = useLocation();
  // Start with splash visible — shows on initial load AND every route change.
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Re-trigger splash on every navigation.
    setShowSplash(true);
  }, [location.pathname]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden">
      {/* Logo transition splash — shown on load and every page change */}
      {showSplash && <LogoSplash onComplete={handleSplashComplete} />}

      {/* Animated pill / capsule canvas background */}
      <MedMotifBackground />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <Navbar />

        {/* id="app-scroll-root" is used by Footer's scrollAppToTop() */}
        <main
          id="app-scroll-root"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-smooth"
        >
          {/* flex-1 wrapper pushes footer to the bottom of the page content */}
          <div className="flex min-h-full flex-1 flex-col">
            <div className="flex flex-1 flex-col">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/compare/summary" element={<SummaryPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/about-estimates" element={<AboutEstimatesPage />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </main>
      </div>

      {/* Toast notifications (errors, confirmations) */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0d1e35',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '14px',
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#0d1e35' },
          },
          success: {
            iconTheme: { primary: '#2dd4bf', secondary: '#0d1e35' },
          },
        }}
      />
    </div>
  );
}
