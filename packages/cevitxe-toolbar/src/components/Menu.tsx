/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const Menu: FunctionComponent<any> = ({ children, open, ...props }) => {
  return (
    <div
      css={{
        display: open ? 'block' : 'none',
        position: 'absolute',
        background: 'white',
        top: 33,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
