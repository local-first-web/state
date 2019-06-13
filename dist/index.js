
         'use strict'

      if (process.env.NODE_ENV === 'production') {
        module.exports = require('./cevitxe.cjs.production.js')
      } else {
        module.exports = require('./cevitxe.cjs.development.js')
      }