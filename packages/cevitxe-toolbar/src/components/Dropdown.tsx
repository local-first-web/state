/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const Dropdown: FunctionComponent<{ open: boolean; width?: number }> = ({
  open,
  width = 200,
  children,
  ...props
}) => (
  <div
    className={[
      open ? 'block' : 'hidden',
      'absolute mt-1 z-20',
      'shadow-lg',
      'border border-gray-400',
      'divide-y divide-gray-400',
      'bg-white ',
    ].join(' ')}
    css={{ width }}
    {...props}
  >
    {children}
  </div>
)
