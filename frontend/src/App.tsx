import { Routes, Route } from 'react-router-dom';
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
    </div>
  );
}
