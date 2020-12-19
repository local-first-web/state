/** @jsx jsx */
import { jsx } from '@emotion/react'
import { FunctionComponent, useState } from 'react'
import { Button } from './Button'
import { Dropdown } from './Dropdown'

export const DropdownWrapper: FunctionComponent<any> = ({
  children,
  buttonText,
  disabled,
  ...props
}) => {
  const [open, setOpen] = useState(false)
  const toggle = () => setTimeout(() => setOpen(!open))
  const hide = () => setTimeout(() => setOpen(false), 500)

  return (
    <div className="relative inline-block" {...props}>
      <Button onFocus={toggle} onBlur={hide} disabled={disabled}>
        {buttonText}
      </Button>
      <Dropdown open={open}>{children}</Dropdown>
    </div>
  )
}
