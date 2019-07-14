const friendlyWords = require('friendly-words')

const { predicates, objects } = friendlyWords

const randomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

export const wordPair = () => randomElement(predicates) + '-' + randomElement(objects)
