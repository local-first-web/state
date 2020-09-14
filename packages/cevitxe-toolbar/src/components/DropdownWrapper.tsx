/** @jsx jsx */
import { jsx } from '@emotion/core'
import React, { FunctionComponent, useState } from 'react'
import { Button } from './Button'
import { Transition } from '@tailwindui/react'
import { Dropdown } from './Dropdown'

export const DropdownWrapper: FunctionComponent<any> = ({
  children,
  buttonText,
  disabled,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = () => setTimeout(() => setIsOpen(!isOpen))
  const close = () => setTimeout(() => setIsOpen(false))

  return (
    <React.Fragment>
      <div className="relative text-left z-20" {...props}>
        <div className="relative z-10">
          <Button onFocus={toggle}>{buttonText}</Button>
        </div>
        <div onClick={close} className={`${isOpen ? 'block' : 'hidden'} fixed inset-0 z-20`}>
          <div className="absolute inset-0"></div>
        </div>

        <div className="absolute z-0">
          <Transition
            show={isOpen}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95 -translate-y-10"
            enterTo="transform opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-300 "
            leaveFrom="transform opacity-100 scale-100 translate-y-0"
            leaveTo="transform opacity-0 scale-95 -translate-y-5"
          >
            <div className="absolute mt-2 w-56 border-gray-400 rounded-md shadow-lg">
              <div className="rounded-md bg-white shadow-xs">
                <div
                  className="py-1 divide-y divide-gray-400 "
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="options-menu"
                >
                  {children}
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </React.Fragment>
  )
}
