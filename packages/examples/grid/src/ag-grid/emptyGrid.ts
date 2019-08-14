import { JSONSchema7 } from 'json-schema'
import { State } from '../redux/store'
import { range } from 'ramda'

export const emptyGrid = (rowCount: number, colCount: number = rowCount) => {
  const rows = range(0, rowCount).map(i => `row_${i + 1}`)
  const cols = range(0, colCount).map(i => `col_${i + 1}`)

  const rowReducer = (rowMap: State['map'], id: string, i: number) => ({
    ...rowMap,
    [id]: { id },
  })
  const columnReducer = (colMap: JSONSchema7['properties'], id: string, i: number) => ({
    ...colMap,
    [id]: { description: `Field ${+i + 1}` },
  })

  return {
    ...rows.reduce(rowReducer, {}),
    rows,
    schema: { properties: cols.reduce(columnReducer, {}) },
  }
}
