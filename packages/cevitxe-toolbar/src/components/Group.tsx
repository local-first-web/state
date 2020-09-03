/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const Group: FunctionComponent<any> = ({ children, ...props }) => {
  return (
    <div
      className="h-10 p-1 justify-center flex border-r border-gray-400"
      css={{
        minWidth: 40,
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
