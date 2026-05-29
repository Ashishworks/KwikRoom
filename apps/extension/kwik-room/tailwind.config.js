/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{js,ts,jsx,tsx}", // Keeps scanning files in the root like sidepanel.tsx
    "./components/**/*.{js,ts,jsx,tsx}", // 👉 ADD THIS LINE to scan your new components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}