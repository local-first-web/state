/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const Button: FunctionComponent<any> = ({ children, className, ...props }) => {
  return (
    <button
      role="button"
      type="button"
      className={`
        inline-flex items-center 
        px-3 py-2 h-8
        border border-gray-300 
        text-sm leading-tight font-bold rounded-md text-gray-700 
        bg-white 
        hover:text-gray-900 hover:bg-blue-100
        focus:outline-none focus:border-blue-300 focus:shadow-outline-blue 
        active:text-gray-800 active:bg-gray-50 
        transition ease-in-out duration-150
        ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
