import { createUser, loadUser } from 'taco-js'
import { randomUserName } from './randomName'

export const localUser = loadUser() || createUser(randomUserName())
