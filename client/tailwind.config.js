/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark mode is toggled by adding/removing the "dark" class on <html>
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — Sky Blue palette (shared across both themes)
        brand: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          400: '#38bdf8',  // glow / accent on dark
          500: '#0ea5e9',  // primary accent
          600: '#0284c7',  // pressed / hover
          700: '#0369a1',  // deep press on light backgrounds
        },
        // Surface — OLED dark-mode canvas layers
        surface: {
          oled:     '#000000',
          dark:     '#121212',
          darker:   '#080808',
          raised:   '#181818',
          elevated: '#222222',
        },
        // Light-mode surface layers — warm off-whites for a premium feel
        // instead of cold pure-white, these use a hint of slate warmth
        light: {
          canvas:   '#f8fafc',   // page background (slate-50)
          card:     '#ffffff',   // card / elevated surface
          raised:   '#f1f5f9',   // secondary surfaces, inputs (slate-100)
          muted:    '#e2e8f0',   // borders, dividers (slate-200)
          subtle:   '#cbd5e1',   // disabled / extra-muted (slate-300)
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // 8 px cards and inputs — matches Tailwind's built-in "lg"
        card: '8px',
      },
      // Soft shadows for light mode depth — dark mode uses borders instead
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'elevated': '0 4px 16px 0 rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
};
