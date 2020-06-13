/** @jsx jsx */
import { jsx } from '@emotion/core'

export const StatusLight = ({ connected }: { connected: boolean }) => (
  <div css={styles(connected).statusLight}>
    <span></span>
  </div>
)

const styles = (connected: boolean) => ({
  statusLight: {
    display: 'inline-block',
    marginRight: '1em',
    span: {
      display: 'block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      border: '1px solid white',
      background: connected ? 'green' : 'silver',
    },
  },
})
