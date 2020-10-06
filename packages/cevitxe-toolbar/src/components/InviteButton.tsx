// import { Button } from './Button'
import {
  Label,
  Input,
  HelperText,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@windmill/react-ui'
import React, { FunctionComponent, useState } from 'react'

const ModalIcon: FunctionComponent = ({ children }) => (
  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 text-xl rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
    {children}
  </div>
)

const ModalContent: FunctionComponent = ({ children }) => (
  <div className="-mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">{children}</div>
)

export const InviteButton: FunctionComponent = () => {
  const [isOpen, setIsOpen] = useState(false)

  const open = () => {
    setTimeout(() => setIsOpen(true))
  }

  const close = () => {
    setTimeout(() => setIsOpen(false))
  }

  return (
    <div className="relative">
      <Button layout="outline" onFocus={open}>
        💌 Invite
      </Button>
      <Modal isOpen={isOpen} onClose={close} className="w-24 bg-yellow">
        <ModalBody>
          <div className="flex flex-row">
            <ModalIcon>💌</ModalIcon>
            <div className="ml-3 -mt-1">
              <ModalHeader>Who do you want to invite?</ModalHeader>
              <Label>
                <p>Enter their username</p>
                <Input id="username" autoFocus={isOpen} className="mt-1" />
                <HelperText>e.g. mister.kittycat</HelperText>
              </Label>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button layout="outline" className="w-full sm:w-auto" onClick={close}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto">Invite</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
