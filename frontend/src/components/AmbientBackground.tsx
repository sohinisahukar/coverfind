import { useTheme } from '../context/ThemeContext';

/**
 * Full-viewport ambient layer: mesh gradients, slow rotating wash, drifting grid,
 * and soft pulse — motion is intentionally slow but visible (UXguy.io–style “alive”
 * backdrop). Respects `prefers-reduced-motion` via `motion-safe:*`.
 */
export default function AmbientBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={
        isDark
          ? 'pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#06080d] transition-colors duration-500'
          : 'pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#f7f6f3] transition-colors duration-500'
      }
      aria-hidden
    >
      {/* Slow rotating conic wash — continuous, engaging color drift */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center motion-safe:animate-spin-slow">
        <div
          className={
            isDark
              ? 'h-[220vmin] w-[220vmin] shrink-0 rounded-full bg-[conic-gradient(from_0deg_at_50%_50%,rgba(45,212,191,0.32),transparent_22%,rgba(56,189,248,0.28),transparent_48%,rgba(129,140,248,0.26),transparent_72%,rgba(45,212,191,0.24))] opacity-[0.35] blur-[118px] will-change-transform'
              : 'h-[220vmin] w-[220vmin] shrink-0 rounded-full bg-[conic-gradient(from_0deg_at_50%_50%,rgba(20,184,166,0.45),transparent_26%,rgba(125,211,252,0.5),transparent_52%,rgba(167,243,208,0.4),transparent_76%,rgba(20,184,166,0.38))] opacity-[0.5] blur-[100px] will-change-transform'
          }
        />
      </div>

      {/* Horizontal sheen — slow lateral drift */}
      <div
        className={
          isDark
            ? 'pointer-events-none absolute inset-x-[-25%] top-[36%] h-px motion-safe:animate-sheen-x bg-gradient-to-r from-transparent via-teal-300/30 to-transparent blur-[6px] will-change-transform'
            : 'pointer-events-none absolute inset-x-[-25%] top-[40%] h-[2px] motion-safe:animate-sheen-x bg-gradient-to-r from-transparent via-teal-600/25 to-transparent blur-[8px] will-change-transform'
        }
      />

      {/* Mesh orbs — layered drift */}
      {isDark ? (
        <>
          <div
            className="absolute -left-[20%] top-[-10%] h-[min(85vw,520px)] w-[min(85vw,520px)] rounded-full bg-teal-500/[0.16] blur-[100px] motion-safe:animate-aurora-a will-change-transform"
            style={{ animationDuration: '34s' }}
          />
          <div
            className="absolute -right-[15%] top-[25%] h-[min(70vw,440px)] w-[min(70vw,440px)] rounded-full bg-sky-500/[0.12] blur-[90px] motion-safe:animate-aurora-b will-change-transform"
            style={{ animationDuration: '42s', animationDelay: '-6s' }}
          />
          <div
            className="absolute bottom-[-20%] left-[30%] h-[min(90vw,560px)] w-[min(90vw,560px)] rounded-full bg-indigo-600/[0.14] blur-[110px] motion-safe:animate-aurora-c will-change-transform"
            style={{ animationDuration: '38s', animationDelay: '-12s' }}
          />
          <div
            className="absolute left-[15%] top-[45%] h-[min(55vw,320px)] w-[min(55vw,320px)] rounded-full bg-cyan-500/[0.08] blur-[80px] motion-safe:animate-aurora-b will-change-transform"
            style={{ animationDuration: '52s', animationDelay: '-20s' }}
          />
          <div
            className="pointer-events-none absolute inset-0 motion-safe:animate-ambient-pulse bg-[radial-gradient(ellipse_85%_55%_at_50%_0%,rgba(45,212,191,0.14),transparent_58%)] will-change-[opacity]"
            style={{ animationDuration: '22s' }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute -left-[25%] top-[-15%] h-[min(90vw,480px)] w-[min(90vw,480px)] rounded-full bg-teal-400/28 blur-[100px] motion-safe:animate-aurora-a will-change-transform"
            style={{ animationDuration: '36s' }}
          />
          <div
            className="absolute -right-[20%] top-[20%] h-[min(75vw,400px)] w-[min(75vw,400px)] rounded-full bg-sky-300/32 blur-[95px] motion-safe:animate-aurora-b will-change-transform"
            style={{ animationDuration: '44s', animationDelay: '-8s' }}
          />
          <div
            className="absolute bottom-[-25%] right-[10%] h-[min(85vw,500px)] w-[min(85vw,500px)] rounded-full bg-emerald-200/38 blur-[100px] motion-safe:animate-aurora-c will-change-transform"
            style={{ animationDuration: '40s', animationDelay: '-14s' }}
          />
          <div
            className="absolute left-[10%] top-[50%] h-[min(60vw,340px)] w-[min(60vw,340px)] rounded-full bg-sky-200/25 blur-[85px] motion-safe:animate-aurora-b will-change-transform"
            style={{ animationDuration: '54s', animationDelay: '-22s' }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(255,255,255,0.88),transparent_50%)]" />
          <div
            className="pointer-events-none absolute inset-0 motion-safe:animate-ambient-pulse bg-[radial-gradient(ellipse_90%_50%_at_50%_15%,rgba(20,184,166,0.12),transparent_55%)] will-change-[opacity]"
            style={{ animationDuration: '24s' }}
          />
        </>
      )}

      {/* Grid — slow crawl (reads as subtle parallax) */}
      <div
        className={
          isDark
            ? 'pointer-events-none absolute inset-0 motion-safe:animate-grid-drift opacity-[0.38] [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px] will-change-[background-position]'
            : 'pointer-events-none absolute inset-0 motion-safe:animate-grid-drift opacity-[0.48] [background-image:linear-gradient(rgba(15,23,42,0.065)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.065)_1px,transparent_1px)] [background-size:48px_48px] will-change-[background-position]'
        }
      />

      {/* Vignette — static frame */}
      <div
        className={
          isDark
            ? 'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_100%_at_50%_50%,transparent_40%,rgba(0,0,0,0.48)_100%)]'
            : 'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_115%_100%_at_50%_50%,transparent_35%,rgba(247,246,243,0.92)_100%)]'
        }
      />
    </div>
  );
}
