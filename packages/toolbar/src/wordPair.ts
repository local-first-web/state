import friendlyWords from 'friendly-words'

const { predicates, objects } = friendlyWords

const randomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

export const wordPair = (): string => randomElement(predicates) + '-' + randomElement(objects)
