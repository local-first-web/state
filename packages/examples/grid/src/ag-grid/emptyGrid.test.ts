import { emptyGrid } from './emptyGrid'
import { collection } from 'cevitxe'

describe('emptyGrid', () => {
  it('2x2', () => {
    const state = emptyGrid(2)
    const rows = collection('rows')
    const allRows = rows.toArray(state)
    expect(allRows).toEqual([{ id: 'row_1' }, { id: 'row_2' }])
    expect(state.schema).toEqual({
      properties: {
        col_1: { description: 'Field 1' },
        col_2: { description: 'Field 2' },
      },
    })
  })

  it('5x3', () => {
    const state = emptyGrid(5, 3)
    const rows = collection('rows')
    const allRows = rows.toArray(state)
    expect(allRows).toEqual([
      { id: 'row_1' },
      { id: 'row_2' },
      { id: 'row_3' },
      { id: 'row_4' },
      { id: 'row_5' },
    ])
    expect(state.schema).toEqual({
      properties: {
        col_1: { description: 'Field 1' },
        col_2: { description: 'Field 2' },
        col_3: { description: 'Field 3' },
      },
    })
  })
})
