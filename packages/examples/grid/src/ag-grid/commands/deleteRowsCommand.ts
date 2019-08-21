import { GetContextMenuItemsParams } from 'ag-grid-community'
import { removeItem } from 'redux/actions'
import { Dispatch, AnyAction } from 'redux'
import { getSelectedRowIds } from 'ag-grid/gridUtils';

export const deleteRowsCommand = (
  dispatch: Dispatch<AnyAction>,
  { api, node }: GetContextMenuItemsParams
) => {
  if (!api) return

  let rowIds: string[] = getSelectedRowIds(api, node)

  const name = `Delete ${rowIds.length} ${rowIds.length === 1 ? 'row' : 'rows'}`

  const deleteRow = (rowId: string) => dispatch(removeItem(rowId))
  const action = () => rowIds.forEach(deleteRow)

  return { name, action }
}
