/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const MenuWrapper: FunctionComponent<any> = ({ children, ...props }) => {
  return (
    <div className="relative inline-block" {...props}>
      {children}
    </div>
  )
}
