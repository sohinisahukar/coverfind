import { useTheme } from '../context/ThemeContext';
import MedMotifField from './MedMotifField';

/**
 * Pill-field background (capsules, tablets, beads); pointer-reactive spring motion. Default theme is dark.
 */
export default function MedMotifBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={
        isDark
          ? 'pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-br from-[#070a0d] via-slate-950 to-[#0c1218] transition-colors duration-500'
          : 'pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-br from-slate-100 via-sky-50 to-cyan-50/90 transition-colors duration-500'
      }
    >
      {isDark ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_70%_at_50%_0%,rgba(56,189,248,0.14),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_100%,rgba(244,63,94,0.06),transparent)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_85%_at_50%_-15%,rgba(125,211,252,0.22),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_100%_50%,rgba(253,224,71,0.08),transparent)]" />
        </>
      )}
      <MedMotifField isDark={isDark} />
    </div>
  );
}
