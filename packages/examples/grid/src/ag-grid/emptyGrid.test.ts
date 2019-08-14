import { emptyGrid } from './emptyGrid'

describe('emptyGrid', () => {
  it('2x2', () => {
    expect(emptyGrid(2)).toEqual({
      row_1: { id: 'row_1' },
      row_2: { id: 'row_2' },
      rows: ['row_1', 'row_2'],
      schema: {
        properties: {
          col_1: { description: 'Field 1' },
          col_2: { description: 'Field 2' },
        },
      },
    })
  })
  it('5x3', () => {
    expect(emptyGrid(5, 3)).toEqual({
      row_1: { id: 'row_1' },
      row_2: { id: 'row_2' },
      row_3: { id: 'row_3' },
      row_4: { id: 'row_4' },
      row_5: { id: 'row_5' },
      rows: ['row_1', 'row_2', 'row_3', 'row_4', 'row_5'],
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
