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
import React, { FC, FormEvent, useRef, useState } from 'react'

const ModalIcon: FC = ({ children }) => (
  <div
    className="
      mx-auto
      flex items-center justify-center 
      h-12 w-12
      text-xl 
      rounded-full bg-blue-100 "
  >
    {children}
  </div>
)

export const InviteButton: FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const open = () => {
    setTimeout(() => setIsOpen(!isOpen))
  }

  const close = () => {
    setIsOpen(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setIsOpen(false)
    const username = input.current?.value
    console.log('submitted', username)
  }

  return (
    <div className="relative">
      <Button layout="outline" onClick={open}>
        💌 Invite
      </Button>
      <Modal isOpen={isOpen} onClose={close} style={{ width: 400 }}>
        <form onSubmit={submit}>
          <ModalBody className="flex flex-row">
            <ModalIcon>💌</ModalIcon>
            <div className="ml-2 flex-grow">
              <ModalHeader>Who do you want to invite?</ModalHeader>

              <Label>
                <p>Enter their username</p>
                <Input id="username" ref={input} autoFocus={isOpen} className="mt-1" />
                <HelperText>
                  Example: <code>mister.kittycat</code>
                </HelperText>
              </Label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button layout="outline" className="w-full sm:w-auto" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              Invite
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
