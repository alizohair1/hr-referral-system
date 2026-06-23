/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink:    '#13161c',
        paper:  '#f6f5f1',
        accent: '#3b5bff',
        moss:   '#1f7a5a',
        clay:   '#c8462e',
        amber:  '#c98a16',
      },
    },
  },
  plugins: [],
}
