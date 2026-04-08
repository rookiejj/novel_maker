import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"Pretendard Variable"', 'Pretendard', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif KR"', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50:  '#F0EEFF',
          100: '#E4E0FF',
          200: '#C9C1FF',
          300: '#A99CFF',
          400: '#8876F5',
          500: '#6E56E8',
          600: '#5B43D4',
          700: '#4A34B8',
          800: '#3A2890',
          900: '#2C1E6B',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;