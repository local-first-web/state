import { GridApi, CellRange, RowNode } from 'ag-grid-community'
import * as R from 'ramda'

export const getRowIndexesFromCellRange = (cellRange: CellRange) => {
  const startRowIndex = cellRange.startRow!.rowIndex
  const endRowIndex = cellRange.endRow!.rowIndex + 1
  return R.range(startRowIndex, endRowIndex)
}

export const getDistinctIndexesFromCellRanges = (cellRanges: CellRange[]) =>
  R.uniq(R.flatten(cellRanges.map(getRowIndexesFromCellRange)))

export const getRowIdFromIndex = (api: GridApi) => (i: number) => api.getModel().getRow(i)!.id

export const getSelectedRowIds = (api: GridApi, node: RowNode) =>
  api.getCellRanges().length
    ? getDistinctIndexesFromCellRanges(api.getCellRanges()).map(getRowIdFromIndex(api))
    : [node.data.id]
