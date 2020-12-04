import React from 'react'

const Button: React.FC<ButtonProps & ExtendElement<'button'>> = ({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <span className="inline-flex rounded-md shadow-sm">
      <button
        role="button"
        type="button"
        className={`
          inline-flex items-center 
          
          font-bold 
          focus:outline-none  
          active:text-neutral-800 active:bg-neutral-50 
          transition ease-in-out duration-150
          ${sizes[size]}
          ${variants[variant]}
          ${className}`}
        {...props}
      >
        {children}
      </button>
    </span>
  )
}

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs   leading-4 h-7 rounded',
  sm: 'px-3   py-2   text-sm   leading-4 h-7 rounded-md',
  md: 'px-4   py-2   text-sm   leading-5 h-8 rounded-md',
  lg: 'px-4   py-2   text-base leading-6 h-9 rounded-md',
  xl: 'px-6   py-3   text-base leading-6 h-9 rounded-md',
}
type ButtonSize = keyof typeof sizes

const variants = {
  default: `border border-neutral-300 text-neutral-700 bg-white hover:text-neutral-500 focus:border-primary-300 focus:shadow-outline-primary active:text-neutral-800 active:bg-neutral-50 `,
  primary: `border border-transparent text-white bg-primary-600 hover:bg-primary-500 focus:border-primary-700 focus:shadow-outline-primary active:bg-primary-700 `,
  secondary: `border border-transparent text-secondary-700 bg-secondary-100 hover:bg-secondary-50 focus:border-secondary-300 focus:shadow-outline-secondary active:bg-secondary-200 `,
}
type ButtonVariant = keyof typeof variants

type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

type JsxElementName = keyof JSX.IntrinsicElements
type ExtendElement<t extends JsxElementName> = React.PropsWithoutRef<JSX.IntrinsicElements[t]>

export { Button }
