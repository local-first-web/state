import { JSONSchema7 } from 'json-schema'
import uuid from 'uuid'

export function inferSchema(sampleData: any): JSONSchema7 {
  //no error handling or anything for now
  const firstRow = Object.values<any>(sampleData)[0]
  const visiblePropertyEntries = Object.entries<any>(firstRow).filter(([name]) => name !== 'id')
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `https://factbook.app/${uuid()}.json`,
    type: 'object',
    properties: Object.fromEntries(
      visiblePropertyEntries.map(([name, value]) => {
        let schema: any = {}
        if (typeof value === 'number') schema = { type: 'number' }
        return [name, schema]
      })
    ),
  }
}
