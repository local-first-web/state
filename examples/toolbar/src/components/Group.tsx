/** @jsx jsx */
import { jsx } from '@emotion/react'
import { FunctionComponent } from 'react'

export const Group: FunctionComponent<any> = ({ children, ...props }) => {
  return (
    <div
      className="h-10 py-1 px-3 border-r border-gray-400 justify-center flex "
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
