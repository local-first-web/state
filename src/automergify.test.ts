import { automergify } from './automergify'
import automerge from 'automerge'
import { INITIALIZE } from './constants'

interface FooState {
  foo?: string
  boo?: string
}

describe('automergify', () => {
  const foo: FooState = { foo: 'bar' }

  test('should return an object with the given properties', () => {
    const result = automergify(foo)
    expect(result.foo).toEqual('bar')
  })

  test('should return an automerge object', () => {
    const result = automergify(foo)
    expect(() => automerge.change(result, s => (s.foo = 'baz'))).not.toThrow()
  })

  test('should not affect the source object', () => {
    const result = automergify(foo)
    expect(() => automerge.change(result, s => (s.foo = 'baz')))
    expect(foo.foo).toEqual('bar')
  })

  test('should produce the expected change history', () => {
    const result = automergify(foo)
    const history = automerge.getHistory(result)
    const { change } = history[0]
    expect(change).toMatchObject({
      message: INITIALIZE,
      ops: [{ action: 'set', key: 'foo', value: 'bar' }],
    })
  })
})
