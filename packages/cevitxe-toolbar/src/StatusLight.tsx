/** @jsx jsx */
import { jsx } from '@emotion/core'

export const StatusLight = ({ online }: { online: boolean }) => (
  <div css={styles(online).statusLight}>
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
