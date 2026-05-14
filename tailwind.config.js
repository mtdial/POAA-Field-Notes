/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        garnet:  '#73000A',
        'garnet-tint': '#F4ECEC',
        'dark-grey': '#2B2B2B',
        'mid-grey': '#595959',
        'light-grey': '#BFBFBF',
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
