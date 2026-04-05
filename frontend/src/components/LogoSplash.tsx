/**
 * LogoSplash.tsx — Logo draw-in overlay shown on every page transition.
 *
 * Timeline (1.5 s total):
 *   0.0 – 1.0 s   logo strokes draw in
 *   1.0 – 1.2 s   scale pulse
 *   1.2 – 1.5 s   overlay fades out
 *   1.5 s          onComplete fires
 */

import { useEffect, useState } from 'react';
import LogoMark from './LogoMark';

interface Props {
  onComplete: () => void;
}

export default function LogoSplash({ onComplete }: Props) {
  const [phase, setPhase] = useState<'drawing' | 'pulse' | 'fade'>('drawing');

  useEffect(() => {
    // Reset to drawing phase whenever the component mounts (new page).
    setPhase('drawing');

    const t1 = setTimeout(() => setPhase('pulse'), 1000);
    const t2 = setTimeout(() => setPhase('fade'),  1200);
    const t3 = setTimeout(onComplete,               1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className={`
        fixed inset-0 z-[200] flex flex-col items-center justify-center
        bg-[#0b1014]
        transition-opacity duration-300 ease-in
        ${phase === 'fade' ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
    >
      <div
        className={`
          transition-transform duration-200 ease-out
          ${phase === 'pulse' ? 'scale-110' : 'scale-100'}
        `}
      >
        <LogoMark size={110} animated />
      </div>

      <p
        className={`
          mt-5 text-xl font-semibold tracking-tight text-white
          transition-opacity duration-300
          ${phase === 'drawing' ? 'opacity-0' : 'opacity-100'}
        `}
      >
        Careculator
      </p>
    </div>
  );
}
