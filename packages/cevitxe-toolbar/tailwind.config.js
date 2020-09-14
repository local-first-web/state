const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  purge: ['./src/**/*.tsx', './src/**/*.jsx', './public/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Consolas', '"Segoe UI Emoji"', ...defaultTheme.fontFamily.sans],
      },
      zIndex: {
        toolbar: 100,
        'dropdown-backdrop': 109,
        dropdown: 110,
        'modal-backdrop': 119,
        modal: 120,
      },
    },
  },
  plugins: [require('@tailwindcss/ui')],
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
}
