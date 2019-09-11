import uuid from 'uuid'
import faker from 'faker'

declare const self: Worker

// async function* generate(rows: number) {
//   const collection = {} as any

//   for (let i = 0; i < rows; i++) {
//     const item = {
//       id: uuid(),
//       name: faker.name.findName(),
//       email: faker.internet.email(),
//       age: faker.random.number({ min: 18, max: 100 }),
//       street: faker.address.streetAddress(),
//       city: faker.address.city(),
//       state: faker.address.state(),
//       zip: faker.address.zipCode(),
//       gender: faker.random.arrayElement(['Male', 'Female']),
//       latitude: +faker.address.latitude(),
//       longitude: +faker.address.longitude(),
//       paragraph: faker.lorem.paragraph(),
//     }
//     collection[item.id] = item
//     yield { progress: i }
//   }
//   return { result: collection }
// }

self.addEventListener('message', async e => {
  // const progress = generate(+e.data)
  // for await (const i of progress) self.postMessage(i)
  const collection = {} as any
  const rows = +e.data
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
    self.postMessage({ progress: i })
  }
  self.postMessage({ result: collection })
})

export default {} as typeof Worker & { new (): Worker }
