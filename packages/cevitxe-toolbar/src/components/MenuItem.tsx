/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'
import { Button } from './Button'

export const MenuItem: FunctionComponent<any> = ({ children, open, ...props }) => {
  return (
    <Button
      className={`
        block ml-0 mr-0
        text-left
        rounded-t-none rounded-r-none rounded-b-none rounded-l-none 
        border-t-0 border-r-0 border-b-0 border-l-0
        w-full
      `}
      {...props}
    >
      {children}
    </Button>
  )
}
