import debug from 'debug'
const log = debug(`cevitxe:pause`)
export const pause = (t = 100) => {
  log('start')
  return new Promise(resolve =>
    setTimeout(() => {
      log('end')
      resolve()
    }, t)
  )
}
