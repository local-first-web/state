import { JSONSchema7 } from 'json-schema'
import { State } from './redux/store'

export const emptyGrid = (rowCount: number, colCount: number) => {
  const range = (n: number): number[] => [...Array(n).keys()]

  const rows = range(rowCount).map(i => i.toString())
  const cols = range(colCount).map(i => i.toString())

  const rowReducer = (rowMap: State['map'], i: string) => ({
    ...rowMap,
    [i]: { id: i },
  })
  const columnReducer = (colMap: JSONSchema7['properties'], i: string) => ({
    ...colMap,
    [i]: { description: `Field ${+i + 1}` },
  })

  return {
    list: rows,
    map: rows.reduce(rowReducer, {}),
    schema: { properties: cols.reduce(columnReducer, {}) },
  }
}
