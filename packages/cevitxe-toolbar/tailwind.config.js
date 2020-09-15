const { colors } = require('tailwindcss/defaultTheme')

module.exports = {
  purge: ['./src/**/*.tsx', './src/**/*.jsx', './public/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'Segoe UI Emoji', 'monospace'],
        sans: ['IBM Plex Sans', 'Segoe UI Emoji', 'sans-serif'],
        condensed: ['IBM Plex Sans Condensed', 'Segoe UI Emoji', 'sans-serif'],
        serif: ['IBM Plex Serif', 'Segoe UI Emoji', 'serif'],
      },
      zIndex: {
        toolbar: 100,
        'dropdown-backdrop': 109,
        dropdown: 110,
        'modal-backdrop': 119,
        modal: 120,
      },
      colors: {
        primary: colors.indigo,
        secondary: colors.blue,
        neutral: colors.gray,
      },
    },
  },
  plugins: [require('@tailwindcss/ui')],
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
}
