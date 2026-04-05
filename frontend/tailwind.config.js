/** @type {import('tailwindcss').Config} */
// Tailwind — content paths for client/src
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
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
