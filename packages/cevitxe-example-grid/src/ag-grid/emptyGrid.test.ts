import { emptyGrid } from './emptyGrid'

describe('emptyGrid', () => {
  test('2x2', () => {
    const state = emptyGrid(2)
    expect(state).toEqual({
      rows: {
        row_1: { id: 'row_1' },
        row_2: { id: 'row_2' },
      },
      schema: {
        properties: {
          col_1: { description: 'Field 1' },
          col_2: { description: 'Field 2' },
        },
      },
    })
  })

  test('5x3', () => {
    const state = emptyGrid(5, 3)
    expect(state).toEqual({
      rows: {
        row_1: { id: 'row_1' },
        row_2: { id: 'row_2' },
        row_3: { id: 'row_3' },
        row_4: { id: 'row_4' },
        row_5: { id: 'row_5' },
      },
      schema: {
        properties: {
          col_1: { description: 'Field 1' },
          col_2: { description: 'Field 2' },
          col_3: { description: 'Field 3' },
        },
      },
    })
  })
})
