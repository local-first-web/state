import uuid from 'uuid'
// use shorter ids in development & testing
export const newid = (len: number = 4) =>
  process.env.NODE_ENV === 'production' ? uuid() : uuid().slice(0, len)
