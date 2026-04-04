import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import SpaceBackground from './components/SpaceBackground';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import ComparePage from './pages/ComparePage';
import SummaryPage from './pages/SummaryPage';

export default function App() {
  return (
    <div className="relative min-h-screen">
      <SpaceBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/compare/summary" element={<SummaryPage />} />
          </Routes>
        </main>
      </div>
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
