import { loadUser, createUser } from 'taco-js'
import { DeviceType } from 'taco-js/dist/device'
import { randomUserName } from './randomName'

const _createUser = () => {
  const userName = randomUserName()
  // TODO Taco should expose DeviceType enum
  return createUser({ userName, deviceName: 'laptop', deviceType: DeviceType.laptop })
}

export const localUser = loadUser() || _createUser()
