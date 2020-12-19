import debug from 'debug'
const log = debug(`lf:pause`)
export const pause = (t = 100) => {
  log('start')
  return new Promise<void>(resolve =>
    setTimeout(() => {
      log('end')
      resolve()
    }, t)
  )
}
