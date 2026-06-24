/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand:   '#456158',
        sidebar: '#1a1a1a',
        gold:    '#c9a84c',
        cream:   '#f8f5f0',
      },
    },
  },
  plugins: [],
}
