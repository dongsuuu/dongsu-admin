/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0e1a',
        'bg-secondary': '#161b22',
        'bg-tertiary': '#0d1117',
        'border': '#2a3441',
        'accent-blue': '#58a6ff',
        'accent-green': '#3fb950',
        'accent-red': '#f85149',
        'accent-purple': '#a371f7',
        'accent-orange': '#d29922',
      }
    },
  },
  plugins: [],
}
