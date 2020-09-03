/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const Menu: FunctionComponent<any> = ({ children, open, ...props }) => {
  return (
    <div
      className={`
        ${open ? 'block' : 'hidden'}
        absolute ml-2 mt-1
        shadow-lg
        border border-gray-400
        divide-y divide-gray-400
        bg-white 
      `}
      css={{ width: 200 }}
      {...props}
    >
      {children}
    </div>
  )
}
