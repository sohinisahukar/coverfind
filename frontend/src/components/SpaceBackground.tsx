export default function SpaceBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#07101f]">
      {/* Radial glow at bottom-center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-500/10 rounded-full blur-[120px]" />
      {/* Top-right accent */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
      {/* Scattered star dots */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 80 }).map((_, i) => (
          <circle
            key={i}
            cx={`${Math.random() * 100}%`}
            cy={`${Math.random() * 100}%`}
            r={Math.random() > 0.85 ? 1.5 : 0.8}
            fill="white"
            opacity={Math.random() * 0.7 + 0.3}
          />
        ))}
      </svg>
      {/* Floating glass squares (decorative) */}
      <div className="absolute bottom-16 left-8 w-24 h-24 rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm rotate-12 opacity-40" />
      <div className="absolute bottom-32 left-20 w-16 h-16 rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm -rotate-6 opacity-30" />
      <div className="absolute bottom-8 right-12 w-20 h-20 rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm rotate-6 opacity-40" />
      <div className="absolute top-1/3 right-4 w-14 h-14 rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm -rotate-12 opacity-30" />
    </div>
  );
}
