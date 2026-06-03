/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0F1B2D',
        gold: '#D4A853',
        green: { guardian: '#2E9E6B' },
        red: { dispute: '#E05252' },
        amber: { warning: '#E8A020' },
        paper: '#FBF9F6',
        ink: '#1A1A1A',
      },
      fontFamily: {
        display: ['Literata', 'Georgia', 'serif'],
        body: ['DM Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '8px',
      },
      boxShadow: {
        card: 'none',
        low: '0 1px 3px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
