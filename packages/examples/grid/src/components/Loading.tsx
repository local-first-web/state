/** @jsx jsx */

import { css, jsx } from '@emotion/core'
import Spinner from 'react-spinkit'

export const Loading = () => {
  return (
    <div css={styles.loading}>
      <span css={styles.label}>Loading...</span>
      <span css={styles.spinner}>
        <Spinner name="ball-clip-rotate" color="teal" />
      </span>
    </div>
  )
}

const styles = {
  loading: css({
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(150,150,150,.5)',
    textAlign: 'center',
    paddingTop: '30%',
  }),
  label: css({
    letterSpacing: 3,
    fontSize: 10,
    color: 'gray',
    textTransform: 'uppercase',
  }),
  spinner: css({
    display: 'block',
    margin: 30,
  }),
}
