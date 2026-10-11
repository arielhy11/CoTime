/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Mirrors src/theme/tokens.ts — keep in sync.
      colors: {
        background: '#0D0A14',
        surface: '#1A1426',
        'surface-high': '#261D38',
        primary: '#FF5A1F',
        zen: '#B8F34A',
        danger: '#FF3B5C',
        gold: '#FFD23F',
        'text-primary': '#FFF8F0',
        'text-muted': '#A99BC2',
      },
      fontFamily: {
        body: ['Rubik_400Regular'],
        bold: ['Rubik_700Bold'],
        black: ['Rubik_900Black'],
      },
    },
  },
  plugins: [],
};
