/** @jsx jsx */
import { jsx } from '@emotion/core'
import { menu, styles } from 'cevitxe-toolbar'
import { debug } from 'debug'
import faker from 'faker'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { clearCollection, loadCollection, loadSchema } from 'src/redux/actions'
import uuid from 'uuid'

const log = debug('cevitxe:grid:datagenerator')

export function DataGenerator() {
  const dispatch = useDispatch()
  const [menuOpen, setMenuOpen] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)

  const toggleMenu = () => setTimeout(() => setMenuOpen(!menuOpen))
  const hideMenu = () => setTimeout(() => setMenuOpen(false), 500)

  const generate = (rows: number) => {
    setGenerationProgress(0)
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
    log('generate: starting', rows)
    let i = 0
    const nextIteration = () => {
      if (i === rows) {
        log('generate: done', rows)
        log('generate: dispatching')
        dispatch(loadCollection(collection))
        log('generate: dispatched')
        setGenerationProgress(0)
        return
      }
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
      setGenerationProgress(Math.ceil((i / rows) * 100))
      i++
      setTimeout(nextIteration, 0)
    }
    nextIteration()
  }

  return (
    <div css={styles.toolbarGroup}>
      <div css={styles.menuWrapper}>
        <button
          role="button"
          type="button"
          onFocus={toggleMenu}
          onBlur={hideMenu}
          css={styles.button}
          disabled={generationProgress > 0}
        >
          Generate data
        </button>
        <div css={menu(menuOpen)}>
          {[100, 1000, 10000, 100000].map(rows => (
            <button
              css={styles.menuItem}
              role="button"
              type="button"
              onClick={() => {
                generate(rows)
              }}
            >
              {rows} rows
            </button>
          ))}
        </div>
      </div>
      {generationProgress > 0 && <label>{`Generating... ${generationProgress}%`}</label>}
    </div>
  )
}
