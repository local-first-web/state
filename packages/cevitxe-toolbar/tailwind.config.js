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
  variants: {},
  plugins: [require('@tailwindcss/ui')],
  future: {
    removeDeprecatedGapUtilities: true,
  },
}
