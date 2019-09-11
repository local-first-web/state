module.exports = function override(config, env) {
  // It's important to add the worker loader *before* other loaders - in particular the typescript
  // loader. `unshift` adds it at the beginning of the rules array.
  config.module.rules.unshift({
    test: /\.worker\.ts$/,
    loader: 'worker-loader',
    options: { inline: true, fallback: false },
  })

  // https://github.com/webpack/webpack/issues/6642#issuecomment-421857049
  config.output.globalObject = `(typeof self !== 'undefined' ? self : this)`

  return config
}
