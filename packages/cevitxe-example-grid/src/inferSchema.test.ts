import { inferSchema } from './inferSchema'

describe('inferSchema', () => {
  test('two strings', () => {
    const input = [{ first: 'Diego', last: 'Mijelshon' }]
    const expected = { first: {}, last: {} }
    expect(inferSchema(input).properties).toEqual(expected)
  })

  test('string and number', () => {
    const input = [{ first: 'Diego', age: 12 }]
    const expected = { first: {}, age: { type: 'number' } }
    expect(inferSchema(input).properties).toEqual(expected)
  })
})
