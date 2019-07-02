require('fake-indexeddb/auto')

import A from 'automerge'
import { Cevitxe } from './Cevitxe'
import { ProxyReducer } from './types'
import debug from 'debug'
import hypercoreCrypto from 'hypercore-crypto'
import { pause } from './helpers/pause'
const log = debug('cevitxe:CevitxeTests')

interface FooState {
  foo?: number
}

const proxyReducer: ProxyReducer<FooState> = ({ type, payload }) => {
  switch (type) {
    case 'SET_FOO':
      return state => (state.foo = payload.value)
    default:
      return null
  }
}

describe('Cevitxe', () => {
  let cevitxe: Cevitxe<FooState>
  let discoveryKey: string
  const defaultState: FooState = { foo: 1 }

  beforeEach(() => {
    discoveryKey = hypercoreCrypto.keyPair().publicKey.toString('hex')
    cevitxe = new Cevitxe({ discoveryKey, proxyReducer, defaultState })
  })

  // TODO: Close cevitxe after each test?
  // afterEach(async () => {
  //   if (cevitxe) await cevitxe.close()
  // })

  it('createStore should return a connected redux store', async () => {
    expect.assertions(2)
    const store = await cevitxe.createStore()
    expect(store).not.toBeUndefined()
    expect(store.getState()).toEqual(A.from(defaultState))
  })

  it('joinStore should return a connected redux store', async () => {
    expect.assertions(2)
    cevitxe.discoveryKey = hypercoreCrypto.keyPair().publicKey.toString('hex')
    const store = await cevitxe.joinStore()
    expect(store).not.toBeUndefined()
    expect(store.getState()).toEqual({})
  })

  it('close should destroy any current store', async () => {
    expect.assertions(2)
    await cevitxe.createStore()
    expect(cevitxe.getStore()).not.toBeUndefined()
    cevitxe.close()
    expect(cevitxe.getStore()).toBeUndefined()
  })

  it.skip('close should close all connections', async () => {
    // expect.assertions(2)
    await cevitxe.createStore()
    // @ts-ignore
    expect(cevitxe.connections).not.toBeUndefined()
    // @ts-ignore
    expect(cevitxe.swarm).not.toBeUndefined()
    // @ts-ignore
    expect(cevitxe.hub).not.toBeUndefined()
    await pause(100)
    cevitxe.close()
    // @ts-ignore
    expect(cevitxe.connections).toBeUndefined()
    // @ts-ignore
    expect(cevitxe.swarm).toBeUndefined()
    // @ts-ignore
    expect(cevitxe.hub).toBeUndefined()
  })
})
