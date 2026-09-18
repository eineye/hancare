import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0E7C66',
          dark: '#12241F',
          light: '#7FBFAD',
        },
        surface: '#E9E5DC',
        panel: '#F4F1EA',
        chip: '#F1F6F3',
        chipBorder: '#DCE8E2',
        line: '#D9D3C7',
        muted: '#6B7A75',
        faint: '#94A19C',
        warn: '#B4552F',
        warnBg: '#FBF1EC',
        warnBorder: '#F0DDD2',
        warnAccent: '#E07B45',
      },
      fontFamily: {
        sans: ['var(--font-noto-sans-kr)', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
