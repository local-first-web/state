export const toArray = <T>(x: T | T[] | null) => (x === null ? [] : Array.isArray(x) ? x : [x])
