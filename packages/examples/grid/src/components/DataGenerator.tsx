/** @jsx jsx */
import { jsx } from '@emotion/core'
import { menu, styles } from 'cevitxe-toolbar'
// import { debug } from 'debug'
import { JSONSchema7 } from 'json-schema'
import { Fragment, useState } from 'react'
import { useDispatch } from 'react-redux'
import { clearCollection, loadCollection, loadSchema } from 'redux/actions'
import GeneratorWorker from '../workers/generator.worker'
import { ProgressBar } from './ProgressBar'

const generator = new GeneratorWorker()

const nextFrame = () => new Promise(ok => requestAnimationFrame(ok))

// const log = debug('cevitxe:grid:datagenerator')

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

      if (reportedProgress) {
        // only update progress on increases of 1%
        // if (reportedProgress % 10 === 0) {
        await nextFrame()
        setProgress(Math.ceil((reportedProgress / rows) * 100))
        await nextFrame()

        // }
      }
      if (result) {
        await nextFrame()
        setProgress(0)
        const collection = event.data.result
        console.log({ collection })
        dispatch(loadCollection(collection))
      }
    }

    await nextFrame()
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
          {[10, 100, 1000, 10000, 20000, 40000, 60000, 80000].map(rows => (
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
