import { Dropdown as _Dropdown, Transition } from '@windmill/react-ui'
import React, { FunctionComponent, ReactNode, useState } from 'react'
import { Button } from '@windmill/react-ui'

interface Props extends React.HTMLAttributes<HTMLButtonElement> {
  button: ReactNode
  disabled?: boolean
}

const Dropdown: FunctionComponent<Props> = ({ children, button, disabled = false, ...props }) => {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = () => setTimeout(() => setIsOpen(!isOpen))
  const close = () => setTimeout(() => setIsOpen(false))

  return (
    <div className="relative">
      <Button layout="outline" onClick={toggle} disabled={disabled} aria-haspopup="true" {...props}>
        {button}
      </Button>
      <_Dropdown isOpen={isOpen} onClose={close}>
        {children}
      </_Dropdown>
    </div>
  )
}

export { Dropdown }
