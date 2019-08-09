/** @jsx jsx */
import { jsx } from '@emotion/core'
import { debug } from 'debug'
import faker from 'faker'
import { ChangeEvent } from 'react'
import { useDispatch } from 'react-redux'
import { clearCollection, loadCollection, loadSchema } from 'src/redux/actions'
import uuid from 'uuid'

const log = debug('cevitxe:grid:DataGenerator')

export function DataGenerator() {
  const dispatch = useDispatch()

  const generate = async (rows: number) => {
    dispatch(clearCollection())
    dispatch(
      loadSchema({
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
        },
      })
    )
    const collection = {} as any
    for (let i = 0; i < rows; i++) {
      const item = {
        id: uuid(),
        name: faker.name.findName(),
        email: faker.internet.email(),
        age: faker.random.number({ min: 18, max: 100 }),
        street: faker.address.streetAddress(),
        city: faker.address.city(),
        state: faker.address.state(),
        zip: faker.address.zipCode(),
        gender: faker.random.arrayElement(['Male', 'Female']),
        latitude: +faker.address.latitude(),
        longitude: +faker.address.longitude(),
        paragraph: faker.lorem.paragraph(),
      }
      collection[item.id] = item
    }
    dispatch(loadCollection(collection))
  }

  const change = (event: ChangeEvent<HTMLSelectElement>) => {
    const rowsToGenerate = +event.target.value
    if (rowsToGenerate > 0) generate(+rowsToGenerate)
    event.target.value = '0'
  }

  return (
    <div>
      <select onChange={change}>
        <option value={0}>Generate ...</option>
        <option value={100}>100 rows</option>
        <option value={1000}>1,000 rows</option>
        <option value={10000}>10,000 rows</option>
        <option value={100000}>100,000 rows</option>
      </select>
    </div>
  )
}
