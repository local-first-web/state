// ignore file coverage

import cuid from 'cuid'
// use shorter ids in development & testing
export const newid =
  process.env.NODE_ENV === 'production'
    ? cuid
    : (len: number = 4) =>
        cuid()
          .split('')
          .reverse()
          .slice(0, len)
          .join('') //the beginning of a cuid changes slowly, use the end
