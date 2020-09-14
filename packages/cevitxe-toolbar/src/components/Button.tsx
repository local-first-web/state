/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const Button: FunctionComponent<any> = ({ children, className, ...props }) => {
  return (
    <button
      role="button"
      type="button"
      className={`block py-2 px-4  
        font-mono text-sm leading-none uppercase text-gray-900 
        bg-white 
        outline-none
        hover:bg-blue-100 
        rounded-md border border-gray-400 
        transition ease-in-out duration-150
        cursor-pointer 
        ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
