export function mergeUnique(base: string[] = [], add: string[] = [], remove: string[] = []) {
  return base
    .concat(add)
    .reduce(
      (acc, val) => (acc.includes(val) || remove.includes(val) ? acc : acc.concat(val)),
      [] as string[]
    )
}
