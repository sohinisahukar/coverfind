/**
 * HowItWorksPage.tsx — Explains the Careculator recommendation process.
 */

import { motion } from 'motion/react';
import GlowCard from '../components/GlowCard';

const EASE = [0.4, 0, 0.2, 1] as [number, number, number, number];

const steps = [
  {
    num: '01',
    title: 'Tell us what you need',
    body: 'Enter what you\'re looking for — a symptom, condition, or type of care — plus your ZIP code. You don\'t need to be medically precise. We understand everyday language like "food poisoning", "acne", or "knee pain" and map it to relevant specialties.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Optionally add your insurance',
    body: 'If you have health insurance, you can enter your insurer and plan. We use this to overlay an illustrative coverage estimate on top of each clinic\'s cost figures. This is never stored — it only affects the rankings you see.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Set your priority',
    body: 'A simple slider lets you choose whether you care more about keeping costs low or maximising clinical outcomes and recovery speed. You can drag it anywhere in between. This weight feeds directly into how we score and rank results.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    num: '04',
    title: 'We score and rank clinics',
    body: 'Behind the scenes we combine four signals into a composite match score (0–100): average visits needed, recovery speed, outcome quality, and treatment burden. Your cost vs. recovery preference shifts the weighting. The clinic with the best weighted score appears first.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    num: '05',
    title: 'Compare side-by-side',
    body: 'Select up to several clinics using the Compare button on each card. Our compare view shows every metric head-to-head with the winner highlighted, an animated cost chart, and quick-dial or directions buttons so you can act immediately.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="18" rx="1" />
      </svg>
    ),
  },
];

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
      <motion.div
        className="text-center mb-10 sm:mb-14"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-ink mb-3 tracking-tight">How it works</h1>
        <p className="text-ink-muted text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
          Careculator turns your symptoms and budget into a ranked list of nearby clinics — in five steps.
        </p>
      </motion.div>

      <div className="space-y-6 sm:space-y-8">
        {steps.map((s, i) => (
          <motion.div
            key={s.num}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={cardVariants}
            transition={{ delay: i * 0.06 }}
          >
            <GlowCard className="rounded-2xl">
              <div className="glass-card p-5 sm:p-6 flex gap-4 sm:gap-6">
                <div className="shrink-0 flex flex-col items-center gap-2 pt-0.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-cf-teal flex items-center justify-center">
                    {s.icon}
                  </div>
                  <span className="text-[10px] font-bold text-muted tracking-widest">{s.num}</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-ink mb-1.5">{s.title}</h2>
                  <p className="text-subtle text-sm sm:text-base leading-relaxed">{s.body}</p>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <GlowCard className="rounded-2xl mt-8 sm:mt-10">
          <div className="glass-card p-5 sm:p-6 bg-top-rec text-center">
            <p className="text-sm text-subtle leading-relaxed max-w-lg mx-auto">
              <span className="font-semibold text-ink">Reminder:</span> Careculator is a demo tool only. All cost and outcome figures are illustrative estimates. Always confirm details with your healthcare provider and insurer before making decisions.
            </p>
          </div>
        </GlowCard>
      </motion.div>
    </div>
  );
}
