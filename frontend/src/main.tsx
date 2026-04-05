/**
 * main.tsx — React application entry point.
 *
 * Wraps the App in:
 *   StrictMode     -> development-only double-render checks
 *   ErrorBoundary  -> catches render errors and shows a fallback UI
 *   BrowserRouter  -> enables client-side routing (react-router-dom)
 *   ThemeProvider   -> dark/light theme context (persisted in localStorage)
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

const el = document.getElementById('root');
if (!el) {
  throw new Error('Missing #root element');
}

createRoot(el).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
