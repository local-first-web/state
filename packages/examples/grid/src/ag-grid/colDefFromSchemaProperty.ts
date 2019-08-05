import { ColDef } from 'ag-grid-community'

export const colDefFromSchemaProperty = (field: string, schema: any) => {
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
