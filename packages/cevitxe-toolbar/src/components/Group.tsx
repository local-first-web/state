/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const Group: FunctionComponent<any> = ({ children, ...props }) => {
  return (
    <div
      css={{
        borderRight: '1px solid #ddd',
        padding: 3,
        height: 30,
        minWidth: 40,
        textAlign: 'center',
        display: 'flex',
        label: {
          margin: 'auto',
          padding: '0 1em',
        },
      }}
      {...props}
    >
      {children}
    </div>
  )
}
