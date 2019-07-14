import { emptyGrid } from './emptyGrid'

describe('emptyGrid', () => {
  it('should ', () => {
    expect(emptyGrid(2, 2)).toEqual({
      list: ['0', '1'],
      map: {
        '0': { id: '0' },
        '1': { id: '1' },
      },
      schema: {
        properties: {
          '0': { description: 'Field 1' },
          '1': { description: 'Field 2' },
        },
      },
    })
  })
})
