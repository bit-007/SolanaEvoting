// client/tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#121625',
        'bg-secondary': '#1a1f2e',
        'text-primary': '#ffffff',
        'text-secondary': '#a0aec0',
        'accent-primary': '#3b82f6',
        'accent-hover': '#2563eb',
        'border-color': '#2d3748',
      },
    },
  },
  plugins: [],
}