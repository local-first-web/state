import cuid from 'cuid'
// use shorter ids in development & testing
export const newid = (len: number = 4) => {
  return process.env.NODE_ENV === 'production'
    ? cuid()
    : cuid()
        .split('')
        .reverse()
        .slice(0, len)
        .join('')
}
