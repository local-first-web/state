import { JSONSchema7 } from 'json-schema'
import { range } from 'ramda'

const rowCollectionKey = '__rows'

export const emptyGrid = (rowCount: number, colCount: number = rowCount) => {
  const rows = range(0, rowCount).map(i => `row_${i + 1}`)
  const cols = range(0, colCount).map(i => `col_${i + 1}`)

  const rowReducer = (rowMap: { [id: string]: any }, id: string) => ({
    ...rowMap,
    [`${rowCollectionKey}__${id}`]: { id },
  })

  const columnReducer = (colMap: JSONSchema7['properties'], id: string, i: number) => ({
    ...colMap,
    [id]: { description: `Field ${i + 1}` },
  })

  return {
    ...rows.reduce(rowReducer, {}),
    schema: { properties: cols.reduce(columnReducer, {}) },
  }
}
