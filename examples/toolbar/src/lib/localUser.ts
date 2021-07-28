import { loadUser, createUser } from '@philschatz/auth'
import { randomUserName } from './randomName'

const _createUser = () => {
  const userName = randomUserName()
  // TODO Taco should expose DeviceType enum
  return createUser({ userName, deviceName: 'laptop', deviceType: 1 })
}

export const localUser = loadUser() || _createUser()
