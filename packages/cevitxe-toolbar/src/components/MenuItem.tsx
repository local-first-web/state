/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const MenuItem: FunctionComponent<any> = ({ children, className, ...props }) => {
  return (
    <button
      className={`
        block px-4 py-2 
        w-full
        text-left
        text-sm leading-5 text-gray-700 
        hover:bg-blue-100 hover:text-gray-900
        focus:outline-none focus:bg-gray-100 focus:text-gray-900      
        ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
