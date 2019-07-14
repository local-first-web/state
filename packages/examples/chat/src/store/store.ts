import { Cevitxe } from 'cevitxe'
import { proxyReducer } from './reducer'

export const cevitxe = new Cevitxe({
  proxyReducer,
  initialState: { messages: [] },
})
