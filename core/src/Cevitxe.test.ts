require('fake-indexeddb/auto')

import A from 'automerge'
import { Cevitxe } from './Cevitxe'
import { ProxyReducer } from './types'
import debug from 'debug'
import hypercoreCrypto from 'hypercore-crypto'
import { pause } from './helpers/pause'
import uuid = require('uuid')
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
  let documentId: string
  const defaultState: FooState = { foo: 1 }

  beforeEach(() => {
    documentId = uuid()
    cevitxe = new Cevitxe({ documentId, proxyReducer, defaultState })
  })

  // TODO: Close cevitxe after each test?
  // afterEach(async () => {
  //   if (cevitxe) await cevitxe.close()
  // })

  it('createStore should return a connected redux store', async () => {
    expect.assertions(2)
    const store = await cevitxe.createStore(documentId)
    expect(store).not.toBeUndefined()
    expect(store.getState()).toEqual(A.from(defaultState))
  })

  it('joinStore should return a connected redux store', async () => {
    expect.assertions(2)
    const store = await cevitxe.joinStore(documentId)
    expect(store).not.toBeUndefined()
    expect(store.getState()).toEqual({})
  })

  it('close should destroy any current store', async () => {
    expect.assertions(2)
    await cevitxe.createStore(documentId)
    expect(cevitxe.getStore(documentId)).not.toBeUndefined()
    cevitxe.close(documentId)
    expect(cevitxe.getStore(documentId)).toBeUndefined()
  })

  it.skip('close should close all connections', async () => {
    // expect.assertions(2)
    await cevitxe.createStore(documentId)
    // @ts-ignore
    expect(cevitxe.connections).not.toBeUndefined()
    // @ts-ignore
    expect(cevitxe.swarm).not.toBeUndefined()
    // @ts-ignore
    expect(cevitxe.hub).not.toBeUndefined()
    await pause(100)
    cevitxe.close(documentId)
    // @ts-ignore
    expect(cevitxe.connections).toBeUndefined()
    // @ts-ignore
    expect(cevitxe.swarm).toBeUndefined()
    // @ts-ignore
    expect(cevitxe.hub).toBeUndefined()
  })
})
