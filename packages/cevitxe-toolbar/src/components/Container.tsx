/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const Container: FunctionComponent = ({ children }) => {
  return (
    <div
      css={{
        background: '#eee',
        borderBottom: '1px solid #ddd',
        lineHeight: '1',
        display: 'flex',
        flexGrow: 0,
        alignItems: 'center',
        fontFamily: 'inconsolata, monospace',
        fontSize: 14,
        position: 'relative',
        zIndex: 9,
      }}
    >
      {children}
    </div>
  )
}
