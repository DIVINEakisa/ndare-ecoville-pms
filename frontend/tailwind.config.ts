import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f7fee7',
          100: '#ecfccb',
          500: '#3F6212',
          600: '#4D7C0F',
          700: '#3F6212',
          900: '#365314'
        }
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
} satisfies Config;
