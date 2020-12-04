import React, { FunctionComponent } from 'react'

const Group: FunctionComponent<any> = ({ children, ...props }) => {
  return (
    <div className="h-10 py-1 px-3 justify-center flex " style={{ minWidth: 40 }} {...props}>
      {children}
    </div>
  )
}

export { Group }
