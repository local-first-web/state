import React from 'react'

interface Props extends React.LiHTMLAttributes<HTMLLIElement> {}

const DropdownItem = React.forwardRef<HTMLLIElement, Props>(function DropdownItem(props, ref) {
  const { children, ...other } = props

  return (
    <li ref={ref} className="px-2 py-1 last:mb-0" {...other}>
      {children}
    </li>
  )
})

export { DropdownItem }
