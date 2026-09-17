import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1f7a5c',
          dark: '#0f2e24',
          light: '#e8f3ee',
        },
        surface: '#f5f3ee',
      },
    },
  },
  plugins: [],
};

export default config;
