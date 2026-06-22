/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        mist: '#f6f8fb',
        campus: '#4f7cff',
        mint: '#4fc3a1',
        coral: '#ff7b7b',
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
