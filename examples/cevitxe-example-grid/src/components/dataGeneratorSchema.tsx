import { JSONSchema7 } from 'json-schema'

export const dataGeneratorSchema = {
  type: 'object',
  properties: {
    name: {},
    email: { format: 'email' },
    age: { type: 'number' },
    street: {},
    city: {},
    state: {},
    zip: {},
    gender: {},
    latitude: {},
    longitude: {},
    paragraph: {},
    displayOrder: { type: 'number' },
  },
} as JSONSchema7
