const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  purge: ['./src/**/*.tsx', './src/**/*.jsx', './public/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Consolas', '"Segoe UI Emoji"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require('@tailwindcss/ui')],
  future: {
    removeDeprecatedGapUtilities: true,
  },
}
