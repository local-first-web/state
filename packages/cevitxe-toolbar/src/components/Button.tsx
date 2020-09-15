/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const Button: FunctionComponent<any> = ({ children, className, ...props }) => {
  return (
    <button
      role="button"
      type="button"
      className={`block py-2 px-4  
        font-sans font-bold text-xs leading-none text-gray-900 
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
