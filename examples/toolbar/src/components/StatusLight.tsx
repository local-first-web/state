/** @jsx jsx */
import { jsx } from '@emotion/core'

export const StatusLight = ({ online }: { online: boolean }) => (
  <div css={styles(online).statusLight}>
    <span></span>
  </div>
)

const styles = (online: boolean) => ({
  statusLight: {
    display: 'inline-block',
    span: {
      display: 'block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      border: '1px solid white',
      background: online ? 'green' : 'silver',
    },
  },
})
