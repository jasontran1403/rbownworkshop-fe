/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50:'#eff6ff', 100:'#dbeafe', 500:'#3b82f6', 600:'#2563eb', 700:'#1d4ed8' },
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.65)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(59, 130, 246, 0)' },
        },
      },
      animation: {
        'pulse-border': 'pulse-border 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}