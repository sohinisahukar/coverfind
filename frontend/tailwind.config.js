/** @type {import('tailwindcss').Config} */
// Tailwind — content paths for client/src
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Syne', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        /* Ambient mesh — slow, readable travel (larger motion reads through heavy blur) */
        'aurora-a': {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)', opacity: '1' },
          '35%': { transform: 'translate(10%, 6%) scale(1.12)', opacity: '0.88' },
          '70%': { transform: 'translate(-6%, 10%) scale(0.94)', opacity: '0.95' },
        },
        'aurora-b': {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)', opacity: '1' },
          '45%': { transform: 'translate(-12%, -8%) scale(1.14)', opacity: '0.78' },
          '80%': { transform: 'translate(5%, -4%) scale(1.02)', opacity: '0.92' },
        },
        'aurora-c': {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)', opacity: '0.85' },
          '50%': { transform: 'translate(7%, -9%) scale(1.08)', opacity: '1' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'grid-drift': {
          '0%': { backgroundPosition: '0px 0px, 0px 0px' },
          '100%': { backgroundPosition: '48px 48px, 48px 48px' },
        },
        'ambient-pulse': {
          '0%, 100%': { opacity: '0.42' },
          '50%': { opacity: '0.72' },
        },
        'sheen-x': {
          '0%, 100%': { transform: 'translateX(-6%)' },
          '50%': { transform: 'translateX(6%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'icon-breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.06)', opacity: '0.92' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
      },
      animation: {
        'aurora-a': 'aurora-a 32s ease-in-out infinite',
        'aurora-b': 'aurora-b 40s ease-in-out infinite',
        'aurora-c': 'aurora-c 36s ease-in-out infinite',
        'spin-slow': 'spin-slow 95s linear infinite',
        'grid-drift': 'grid-drift 100s linear infinite',
        'ambient-pulse': 'ambient-pulse 18s ease-in-out infinite',
        'sheen-x': 'sheen-x 45s ease-in-out infinite',
        'fade-up': 'fade-up 0.65s ease-out both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'icon-breathe': 'icon-breathe 5s ease-in-out infinite',
        shimmer: 'shimmer 8s linear infinite',
      },
      colors: {
        cf: {
          bg: '#f1f5f9',
          ink: '#0f172a',
          'ink-muted': '#64748b',
          border: '#cbd5e1',
          surface: '#ffffff',
          'surface-soft': '#f8fafc',
          'surface-raised': '#ffffff',
          teal: '#0d9488',
          'teal-bright': '#0f766e',
          blue: '#0369a1',
          sky: '#0284c7',
          sage: '#15803d',
          'sage-light': '#166534',
        },
      },
      accentColor: {
        cf: '#0d9488',
      },
    },
  },
  plugins: [],
};
