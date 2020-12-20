/** @jsxImportSource @emotion/react */
import { FunctionComponent } from 'react'

export const Container: FunctionComponent = ({ children }) => {
  return (
    <div
      className="
        flex flex-row 
        bg-gray-100
        border-b border-gray-400
        text-sm font-mono"
    >
      {children}
    </div>
  )
}
