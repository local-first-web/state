/** @jsx jsx */
import { css, jsx } from '@emotion/core'
import {
  ColDef,
  GetContextMenuItemsParams,
  GetMainMenuItemsParams,
  MenuItemDef,
  ValueParserParams,
  ValueSetterParams,
} from 'ag-grid-community'
import { CellKeyPressEvent, ModelUpdatedEvent } from 'ag-grid-community/dist/lib/events'
import 'ag-grid-community/dist/styles/ag-grid.css'
import 'ag-grid-community/dist/styles/ag-theme-balham.css'
import 'ag-grid-enterprise'
import { AgGridReact } from 'ag-grid-react'
import { debug } from 'debug'
import { useDialog } from 'muibox'
import { useState } from 'react'
import { useSelector, useStore } from 'react-redux'
import { getSelectedRowIds } from 'src/gridUtils'
import {
  addField,
  addItem,
  deleteField,
  removeItem,
  renameField,
  setFieldType,
  updateItem,
} from '../redux/actions'
import { State } from '../redux/store'
import { Loading } from './Loading'
import { ContextMenuFactory } from 'ag-grid-enterprise'
import { deleteCommand } from './deleteCommand'

const log = debug('cevitxe:grid:List')

const List = () => {
  const store = useStore()

  const stateTestId = store.getState()._testId
  log('state id', stateTestId)

  const dispatch = store.dispatch
  const getDispatch = () => store.dispatch

  const ready = useSelector((state: State) => !!state && !!state.list && !!state.schema)
  const rowCount = useSelector((state: State) => ready && state.list.length)

  const collection = useSelector((state: State) => {
    if (!ready) return []
    return state.list.map((d: string) => state.map[d])
  })

  const columns = useSelector((state: State) => {
    if (!ready) return []
    return Object.entries(state.schema.properties || {}).map(entry =>
      colDefFromSchemaProperty(entry[0], entry[1])
    )
  })

  const dialog = useDialog()

  function colDefFromSchemaProperty(field: string, schema: any) {
    const colDef: ColDef = { field }
    if (schema.description) {
      colDef.headerName = schema.description
    }
    switch (schema.type) {
      case 'number':
        colDef.type = 'numericColumn'
        colDef.filter = 'number'
    }
    return colDef
  }

  const [nextRowId, setNextRowId] = useState()
  const [nextColumn, setNextColumn] = useState()

  function handleKeyDown(event: CellKeyPressEvent) {
    if (event.event) {
      switch ((event.event as KeyboardEvent).key) {
        case 'ArrowDown':
        case 'Enter':
          if (event.rowIndex === collection.length - 1) {
            const action = addItem()
            setNextRowId(action.payload.id)
            dispatch(action)
          }
          break
        case 'ArrowRight':
          if (event.colDef.field === columns[columns.length - 1].field) {
            const action = addField()
            setNextColumn(action.payload.id)
            setNextRowId(event.data.id)
            dispatch(action)
          }
          break
      }
    }
  }

  function handleModelUpdated(event: ModelUpdatedEvent) {
    if (nextRowId) {
      const row = event.api.getRowNode(nextRowId)
      if (row) {
        const column = nextColumn
          ? event.columnApi.getColumn(nextColumn)
          : event.api.getFocusedCell().column
        event.api.setFocusedCell(row.rowIndex, column)
      }
      setNextRowId(undefined)
      setNextColumn(undefined)
    }
  }

  function valueSetter(params: ValueSetterParams) {
    if (params.newValue === params.oldValue) return false
    switch (params.colDef.type) {
      case 'numericColumn':
        if (Number.isNaN(params.newValue)) return false
    }
    log('dispatching updateItem, state id', stateTestId)
    const _dispatch = getDispatch()
    _dispatch(updateItem(params.data.id, params.colDef.field!, params.newValue))
    return true
  }

  function valueParser(params: ValueParserParams) {
    switch (params.colDef.type) {
      case 'numericColumn':
        return Number(params.newValue)
      default:
        return params.newValue
    }
  }

  function showRename(params: GetMainMenuItemsParams) {
    const colDef = params.column.getColDef()
    const current = colDef.headerName
    dialog
      .prompt({
        message: 'Rename Field',
        required: true,
        defaultValue: current,
      })
      .then((newName: string) => dispatch(renameField(colDef.field!, newName)))
      .catch(() => {})
  }

  function showDelete(params: GetMainMenuItemsParams) {
    const colDef = params.column.getColDef()
    dialog
      .confirm({ message: `Delete ${colDef.headerName}?` })
      .then(() => dispatch(deleteField(colDef.field!)))
      .catch(() => {})
  }

  function getMainMenu(params: GetMainMenuItemsParams) {
    const colDef = params.column.getColDef()
    const items: MenuItemDef[] = [
      { name: 'Rename', action: () => showRename(params) },
      { name: 'Delete', action: () => showDelete(params) },
      {
        name: 'Change column type',
        subMenu: [
          {
            name: 'Text',
            //Temp hack
            checked: colDef.type !== 'numericColumn',
            action: () => dispatch(setFieldType(colDef.field!, 'string')),
          },
          {
            name: 'Number',
            //Temp hack
            checked: colDef.type === 'numericColumn',
            action: () => dispatch(setFieldType(colDef.field!, 'number')),
          },
        ],
      },
    ]
    return (params.defaultItems as any[]).concat(items)
  }

  const getContextMenuItems = (params: GetContextMenuItemsParams) => {
    const commands = [
      deleteCommand(dispatch, params), //..
    ]
    return (params.defaultItems as any[]).concat(commands)
  }

  return (
    <div>
      {ready ? (
        <div className="ag-theme-balham" css={styles.grid}>
          <AgGridReact
            columnDefs={columns}
            defaultColDef={{
              editable: true,
              resizable: true,
              sortable: true,
              filter: true,
              valueSetter,
              valueParser,
            }}
            rowData={collection}
            deltaRowDataMode={true}
            getRowNodeId={item => item.id}
            onCellKeyDown={handleKeyDown}
            onModelUpdated={handleModelUpdated}
            getMainMenuItems={getMainMenu}
            enableRangeSelection={true}
            enterMovesDown={true}
            enterMovesDownAfterEdit={true}
            getContextMenuItems={getContextMenuItems}
            rowDeselection={true}
          />
        </div>
      ) : (
        <Loading />
      )}
    </div>
  )
}
const styles = {
  grid: css({
    flexGrow: 5,
    height: '100vh',
  }),
}

export default List
