import { Cevitxe } from '@cevitxe/core'
import { proxyReducer } from './reducer'

const cevitxe = new Cevitxe({
  proxyReducer,
  defaultState: { messages: [] },
})

export const createStore = async (discoveryKey: string) => {
  cevitxe.discoveryKey = discoveryKey
  return await cevitxe.createStore()
}

export const joinStore = async (discoveryKey: string) => {
  cevitxe.discoveryKey = discoveryKey
  return await cevitxe.joinStore()
}
