import { ColDef } from 'ag-grid-community'

export const buildColumnFromSchema = (field: string, schema: any) => {
  const colDef: ColDef = { field }

  // Use description if present
  if (schema.description) colDef.headerName = schema.description

  // Default sort = displayOrder
  if (field === 'displayOrder') colDef.sort = 'asc'

  // Our only non-text column type for now
  switch (schema.type) {
    case 'number':
      colDef.type = 'numericColumn'
      colDef.filter = 'number'
  }

  return colDef
}
