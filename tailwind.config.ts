import type { Config } from 'tailwindcss';

const config: Config = {
  // hoverOnlyWhenSupported: true
  // Tailwind의 `hover:` variant를 `@media (hover: hover)` 안에 감싸서,
  // 터치 디바이스(iOS Safari / 모바일 크롬 등)에서 첫 탭이 hover로만 소비되고
  // 두 번째 탭에야 click이 발동하는 "double-tap" 문제를 방지한다.
  // Tailwind 4에선 기본값이지만 v3에선 opt-in이다.
  future: {
    hoverOnlyWhenSupported: true,
  },
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