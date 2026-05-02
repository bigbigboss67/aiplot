/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a1628',
          800: '#0f1f35',
          700: '#111d33',
          600: '#1a2d4a',
          500: '#1e3a5f',
        },
        brand: {
          primary: '#3b82f6',
          hover: '#2563eb',
          light: '#93c5fd',
          dark: '#1d4ed8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
