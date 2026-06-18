/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          500: '#2f5bd0',
          600: '#2549b0',
          700: '#1d3a8f',
        },
      },
    },
  },
  plugins: [],
};
