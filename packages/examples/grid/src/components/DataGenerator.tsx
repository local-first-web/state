/** @jsx jsx */
import { jsx } from '@emotion/core'
import { menu, styles } from 'cevitxe-toolbar'
import { debug } from 'debug'
import faker from 'faker'
import { JSONSchema7 } from 'json-schema'
import { Fragment, useState } from 'react'
import { useDispatch } from 'react-redux'
import { clearCollection, loadCollection, loadSchema } from 'redux/actions'
import uuid from 'uuid'
import { ProgressBar } from './ProgressBar'

const pause = (t: number = 0) => new Promise(ok => setTimeout(ok, t))

const log = debug('cevitxe:grid:datagenerator')

export function DataGenerator() {
  const dispatch = useDispatch()
  const [menuOpen, setMenuOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  const toggleMenu = () => setTimeout(() => setMenuOpen(!menuOpen))
  const hideMenu = () => setTimeout(() => setMenuOpen(false), 500)
  const schema = {
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
  } as JSONSchema7

  const generate = async (rows: number) => {
    setProgress(0)
    dispatch(clearCollection())
    dispatch(loadSchema(schema))
    const collection = {} as any
    log('generate: starting', rows)

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

      // only update progress on increases of 1%
      if (i % (rows / 100) === 0) {
        setProgress(Math.ceil((i / rows) * 100))
        await pause()
      }
    }
    log('generate: done', rows)
    setProgress(0)
    await pause()
    dispatch(loadCollection(collection))
  }

  return (
    <div css={styles.toolbarGroup}>
      <div css={styles.menuWrapper}>
        <button
          type="button"
          onFocus={toggleMenu}
          onBlur={hideMenu}
          css={styles.button}
          disabled={progress > 0}
        >
          {progress ? 'Generating...' : 'Generate data'}
        </button>
        <div css={menu(menuOpen)}>
          {[5, 100, 1000, 10000, 100000].map(rows => (
            <button
              key={rows}
              css={styles.menuItem}
              type="button"
              disabled={progress > 0}
              onClick={() => {
                generate(rows)
              }}
            >
              {rows} rows
            </button>
          ))}
        </div>
      </div>
      {progress > 0 && (
        <Fragment>
          <ProgressBar percentComplete={progress} />
          <label>{`${progress}%`}</label>
        </Fragment>
      )}
    </div>
  )
}
