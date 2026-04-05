/**
 * AboutEstimatesPage.tsx — Explains how cost and outcome estimates are generated.
 */

import { motion } from 'motion/react';

const EASE = [0.4, 0, 0.2, 1] as [number, number, number, number];

const sections = [
  {
    title: 'Where do cost estimates come from?',
    body: [
      'Our cost figures are illustrative averages drawn from public healthcare pricing datasets, adjusted for regional cost-of-living differences. They represent a rough order-of-magnitude estimate of what a typical patient pays out-of-pocket without insurance for a given type of care.',
      'When you add insurance details, we apply a simple percentage reduction based on your stated coverage level. This is not an official quote — it is only meant to help you compare relative costs between providers on the same basis.',
      'Always call the provider or your insurer to get an actual cost estimate before booking an appointment.',
    ],
  },
  {
    title: 'What do the outcome signals mean?',
    body: [
      '"Recovery Speed" reflects aggregate patient-reported timelines for returning to normal activity after treatment at a given type of facility. Faster is better, but it depends heavily on your specific condition.',
      '"Outcome Quality" is a composite of publicly reported patient satisfaction, readmission rates, and complication rates where available. Higher is better.',
      '"Treatment Burden" captures how many follow-up visits, referrals, or ancillary procedures a typical care episode requires. Lower is better — fewer steps means less disruption to your life.',
    ],
  },
  {
    title: 'How is the Match Score calculated?',
    body: [
      'The Match Score (0–100) is a weighted composite of four signals: average visits needed, recovery speed, outcome quality, and treatment burden. Each signal is normalised to a 0–1 range across the result set, then combined using the weights you set on the priority slider.',
      'A score of 100 means this clinic dominates every other clinic in the result set on every dimension you care about. A score below 50 does not mean the clinic is bad — it just means other options perform better on your chosen trade-off.',
    ],
  },
  {
    title: 'What Careculator cannot tell you',
    body: [
      'We do not have access to real-time appointment availability, actual billed amounts, individual physician quality, or whether a specific provider is in-network for your exact plan.',
      'Careculator is a decision-support tool, not a medical recommendation engine. It is intended to help you ask better questions when talking to your insurer and provider — not to replace those conversations.',
    ],
  },
];

export default function AboutEstimatesPage() {
  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
      <motion.div
        className="text-center mb-10 sm:mb-14"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } }}
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-ink mb-3 tracking-tight">About estimates</h1>
        <p className="text-ink-muted text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
          Everything you see in Careculator is an illustrative estimate. Here's what that means — and what it doesn't.
        </p>
      </motion.div>

      <motion.div
        className="space-y-5 sm:space-y-6"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } }}
      >
        {sections.map(s => (
          <motion.div
            key={s.title}
            className="glass-card p-5 sm:p-6"
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
          >
            <h2 className="text-base sm:text-lg font-semibold text-ink mb-3">{s.title}</h2>
            <div className="space-y-2.5">
              {s.body.map((para, i) => (
                <p key={i} className="text-subtle text-sm sm:text-[15px] leading-relaxed">{para}</p>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        className="mt-8 sm:mt-10 rounded-2xl border border-amber-200/80 dark:border-amber-700/40 bg-amber-50/70 dark:bg-amber-950/25 px-5 py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.8, duration: 0.4 } }}
      >
        <div className="flex gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            <span className="font-semibold">Demo only.</span> Careculator is not medical advice and should not be used to make clinical decisions. All figures are illustrative. Always consult a qualified healthcare provider and your insurance company before acting on any information shown here.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
