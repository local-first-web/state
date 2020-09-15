import { Transition } from '@tailwindui/react'
import React, { FunctionComponent, FunctionComponentElement, useState } from 'react'
import { Button } from './Button'

const ModalBackdrop = ({ isOpen, onClick }: { isOpen: boolean; onClick: (e: any) => void }) => (
  <Transition
    show={isOpen}
    enter="transition ease-out duration-300"
    enterFrom="opacity-0"
    enterTo="opacity-100"
    leave="transition ease-in duration-200"
    leaveFrom="opacity-100"
    leaveTo="opacity-0"
  >
    {ref => (
      <div ref={ref} onClick={onClick} className="fixed inset-0 transition-opacity ">
        <div className="absolute inset-0 bg-gray-500 opacity-25"></div>
      </div>
    )}
  </Transition>
)

const ModalHeadline: FunctionComponent = ({ children }) => (
  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
    {children}
  </h3>
)

const ModalIcon: FunctionComponent = ({ children }) => (
  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 text-xl rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
    {children}
  </div>
)

export const InviteButton = () => (
  <Modal buttonText="💌 Invite">
    <ModalIcon>💌</ModalIcon>
    <ModalContent>
      <ModalHeadline>Who do you want to invite?</ModalHeadline>
      <div className="mt-2">
        <div>
          <label htmlFor="username" className="block text-sm font-medium leading-5 text-gray-700">
            Enter their username
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              id="username"
              //autoFocus={isOpen}
              className="form-input block w-full sm:text-sm sm:leading-5 outline-none border-gray-400 "
              placeholder="e.g. mister.kittycat"
              aria-describedby="username-description"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500" id="username-description"></p>
        </div>
      </div>
    </ModalContent>
  </Modal>
)

const ModalContent: FunctionComponent = ({ children }) => (
  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">{children}</div>
)

const ModalDismissButton: FunctionComponent<{ onFocus: (e: any) => void }> = ({ onFocus }) => (
  <div className="hidden sm:block absolute top-0 right-0 pt-4 pr-4">
    <button
      type="button"
      className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition ease-in-out duration-150"
      onFocus={onFocus}
      aria-label="Close"
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
)

const VerticalCenterHack = () => (
  <React.Fragment>
    {/* This element is to trick the browser into vertically centering the modal contents. */}
    <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
  </React.Fragment>
)

export const Modal: FunctionComponent<{ buttonText: string }> = ({ buttonText, children }) => {
  const [isOpen, setIsOpen] = useState(true)

  const open = (e: any) => {
    e.stopPropagation()
    setTimeout(() => setIsOpen(true))
  }

  const close = (e: any) => {
    e.stopPropagation()
    setTimeout(() => setIsOpen(false))
  }

  return (
    <div className="relative">
      <Button onFocus={open}>{buttonText}</Button>
      <div
        className={`
          ${isOpen ? 'block' : 'hidden'} 
          fixed inset-0 overflow-y-auto z-modal-backdrop`}
      >
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <ModalBackdrop isOpen={isOpen} onClick={close}></ModalBackdrop>
          <React.Fragment>
            <VerticalCenterHack />
            {/* Modal panel */}
            <Transition
              show={isOpen}
              enter="transition ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="transition ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-9"
            >
              {ref => (
                <div
                  ref={ref}
                  className="
                    inline-block align-bottom
                    bg-white rounded-lg text-left
                    overflow-hidden shadow-xl transform transition-all
                    sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="modal-headline"
                >
                  {/* Dismiss button */}

                  <ModalDismissButton onFocus={close}></ModalDismissButton>

                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">{children}</div>
                  </div>
                  {/* Footer */}
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <span className="flex w-full rounded-md shadow-sm sm:ml-3 sm:w-auto">
                      <Button variant="primary" onFocus={close}>
                        Invite
                      </Button>
                    </span>
                    <span className="mt-3 flex w-full rounded-md shadow-sm sm:mt-0 sm:w-auto">
                      <Button onFocus={close}>Cancel</Button>
                    </span>
                  </div>
                </div>
              )}
            </Transition>
          </React.Fragment>
        </div>
      </div>
    </div>
  )
}
