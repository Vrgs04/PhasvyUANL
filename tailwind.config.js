/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        mist: '#f6f8fb',
        campus: '#f97316',
        mint: '#fb923c',
        coral: '#ef4444',
      },
      boxShadow: {
        ios: '0 18px 50px rgba(23, 32, 51, 0.10)',
        soft: '0 8px 28px rgba(23, 32, 51, 0.08)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
