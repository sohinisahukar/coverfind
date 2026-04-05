import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MedMotifBackground from './components/MedMotifBackground';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import ComparePage from './pages/ComparePage';
import SummaryPage from './pages/SummaryPage';

export default function App() {
  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden">
      <MedMotifBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main
          id="app-scroll-root"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-smooth"
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/compare/summary" element={<SummaryPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
}
