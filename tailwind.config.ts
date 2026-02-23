/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0d9488',    // Deep teal - trust
          dark: '#0f766e',       // Darker teal
          light: '#14b8a6',      // Lighter teal
        },
        accent: {
          DEFAULT: '#f97316',    // Coral - action
          dark: '#ea580c',       // Darker coral
        },
        sand: {
          DEFAULT: '#fafaf9',    // Warm sand background
          dark: '#f5f5f4',       // Slightly darker
        },
        charcoal: {
          DEFAULT: '#292524',    // Soft black
          light: '#44403c',      // Lighter charcoal
        },
        // Keep legacy names for compatibility
        primary: {
          DEFAULT: '#0d9488',
          dark: '#0f766e',
        },
        secondary: '#f97316',
        dark: {
          DEFAULT: '#292524',
          lighter: '#44403c',
          card: '#57534e',
        },
        success: '#10b981',
      },
    },
  },
  plugins: [],
}
