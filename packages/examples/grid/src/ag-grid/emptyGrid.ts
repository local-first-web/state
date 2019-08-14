import { JSONSchema7 } from 'json-schema'
import { State } from '../redux/store'
import { range } from 'ramda'

export const emptyGrid = (rowCount: number, colCount: number = rowCount) => {
  const rows = range(0, rowCount).map(i => `row_${i + 1}`)
  const cols = range(0, colCount).map(i => `col_${i + 1}`)

  const rowReducer = (rowMap: { [key: string]: any }, id: string, i: number) => ({
    ...rowMap,
    [id]: { id },
  })
  const rowIndexReducer = (rowIndex: State['index'], id: string, i: number) => ({
    ...rowIndex,
    [id]: true,
  })
  const columnReducer = (colMap: JSONSchema7['properties'], id: string, i: number) => ({
    ...colMap,
    [id]: { description: `Field ${+i + 1}` },
  })

  return {
    ...rows.reduce(rowReducer, {}),
    rows: rows.reduce(rowIndexReducer, {}),
    schema: { properties: cols.reduce(columnReducer, {}) },
  }
}
