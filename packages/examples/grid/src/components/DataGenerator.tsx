/** @jsx jsx */
import { jsx } from '@emotion/core'
import { menu, styles } from 'cevitxe-toolbar'
import { JSONSchema7 } from 'json-schema'
import { Fragment, useState } from 'react'
import { useDispatch } from 'react-redux'
import { clearCollection, loadCollection, loadSchema } from 'redux/actions'

import { nextFrame } from '../utils/nextFrame'
import GeneratorWorker from './dataGenerator.worker'
import { ProgressBar } from './ProgressBar'

/**
 * The actual generation of random data is performed in a worker
 */
const generator = new GeneratorWorker()

export function DataGenerator() {
  const dispatch = useDispatch()
  const [menuOpen, setMenuOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  const toggleMenu = () => setTimeout(() => setMenuOpen(!menuOpen))
  const hideMenu = () => setTimeout(() => setMenuOpen(false), 500)

  const generate = async (rows: number) => {
    setProgress(0)
    dispatch(clearCollection())
    dispatch(loadSchema(schema))

    generator.onmessage = async event => {
      const { progress: reportedProgress, result } = event.data

      await nextFrame()
      if (reportedProgress) {
        setProgress(Math.ceil((reportedProgress / rows) * 100))
      }
      if (result) {
        setProgress(0)
        const collection = event.data.result
        dispatch(loadCollection(collection))
      }
    }
    generator.postMessage(rows)
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
          {[10, 100, 1000, 10000, 100000, 200000, 500000, 1000000].map(rows => (
            <button
              key={rows}
              css={styles.menuItem}
              type="button"
              disabled={progress > 0}
              onClick={() => {
                generate(rows)
              }}
            >
              {rows.toLocaleString()} rows
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
