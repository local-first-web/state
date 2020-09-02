/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'
import { Button } from './Button'

export const MenuItem: FunctionComponent<any> = ({ children, open, ...props }) => {
  return (
    <Button
      css={{
        textAlign: 'left',
        marginTop: -2,
        width: 200,
        position: 'relative',
        zIndex: 99,
      }}
      {...props}
    >
      {children}
    </Button>
  )
}
