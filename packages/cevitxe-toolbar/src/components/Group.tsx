import React, { FunctionComponent } from 'react'

export const Group: FunctionComponent<any> = ({ children, ...props }) => {
  return (
    <div
      className="h-10 py-1 px-3 border-r border-gray-400 justify-center flex "
      style={{ minWidth: 40 }}
      {...props}
    >
      {children}
    </div>
  )
}
