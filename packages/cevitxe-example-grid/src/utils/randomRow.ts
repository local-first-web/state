import uuid from 'uuid'
import faker from 'faker'

let i = 0

export function randomRow() {
  return {
    id: uuid()
      .slice(18, 36)
      .replace(/\-/gi, ''),
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
    displayOrder: Date.now() * 1000 + (i++ % 1000), // so we sort items created in the same millisecond correctly
  }
}
