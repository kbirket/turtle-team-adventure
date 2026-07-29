// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        phc: {
          navy:   '#003d6b',
          gold:   '#dba51f',
          blue:   '#1080ad',
          orange: '#dd6d22',
        },
      },
      borderWidth: {
        3: '3px',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
      },
      padding: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};