import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRecommendations, zipToCoords } from '../lib/api';

const FALLBACK_TAGS = ['Primary Care', 'Dental', 'Urgent Care', 'Behavioral Health'];

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [outOfPocket, setOutOfPocket] = useState(true);
  const [priority, setPriority] = useState(50);
  const [quickTags, setQuickTags] = useState<string[]>(FALLBACK_TAGS);

  useEffect(() => {
    fetchRecommendations()
      .then(data => { if (data.quickTags?.length) setQuickTags(data.quickTags); })
      .catch(() => {}); // silently use fallback
  }, []);

  const handleSearch = async (searchQuery = query) => {
    const qs = new URLSearchParams({
      q: searchQuery,
      zip: location,
      priority: String(priority),
    });
    if (location.trim()) {
      const coords = await zipToCoords(location);
      if (coords) {
        qs.set('lat', String(coords.lat));
        qs.set('lng', String(coords.lng));
      }
    }
    navigate(`/results?${qs}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-72px)] px-4 py-10 text-center">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 max-w-2xl leading-tight">
        Find care that's right for you.
      </h1>
      <p className="text-white/50 text-base sm:text-lg mb-8 sm:mb-10 max-w-xl px-2">
        Get recommendations based on real patient experiences — not just distance or cost.
      </p>

      <div className="glass-card w-full max-w-3xl p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="What do you need care for? (e.g. knee pain)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="input-dark pr-10"
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="relative sm:w-60 lg:w-64">
            <input
              type="text"
              placeholder="ZIP code (e.g. 60616)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="input-dark pr-10"
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <label className="flex items-center justify-center gap-2 cursor-pointer">
            <div
              onClick={() => setOutOfPocket(!outOfPocket)}
              className={`w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                outOfPocket ? 'bg-teal-500 border-teal-500' : 'border-white/30 bg-transparent'
              }`}
            >
              {outOfPocket && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-white/70 text-sm">Consider out-of-pocket cost</span>
          </label>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-white/50 text-xs sm:text-sm w-24 sm:w-32 text-right shrink-0">Faster Recovery</span>
            <input
              type="range"
              min={0}
              max={100}
              value={priority}
              onChange={e => setPriority(Number(e.target.value))}
              className="flex-1 accent-teal-500 cursor-pointer min-w-0"
            />
            <span className="text-white/50 text-xs sm:text-sm w-20 sm:w-24 shrink-0">Lower Cost</span>
          </div>
        </div>

        <button onClick={() => handleSearch()} className="w-full btn-primary py-3 sm:py-4 text-base rounded-xl">
          Find Best Care
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 mt-6 sm:mt-8 flex-wrap justify-center px-2">
        {quickTags.map(tag => (
          <button
            key={tag}
            onClick={() => handleSearch(tag)}
            className="border border-white/15 text-white/60 text-xs sm:text-sm px-4 sm:px-5 py-1.5 sm:py-2 rounded-full hover:border-teal-500/40 hover:text-white transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
