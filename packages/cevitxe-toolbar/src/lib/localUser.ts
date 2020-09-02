import { user, team } from 'taco-js'
import { randomUserName } from './randomName'

const createUser = () => {
  const userName = randomUserName()
  return user.create(userName)
}

export const localUser = user.load() || createUser()
