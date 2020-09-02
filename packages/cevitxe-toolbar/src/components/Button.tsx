/** @jsx jsx */
import { jsx } from '@emotion/core'
import { FunctionComponent } from 'react'

export const Button: FunctionComponent<any> = ({ children, css, ...props }) => {
  return (
    <button
      role="button"
      type="button"
      css={{
        ...css,
        background: 'white',
        border: '1px solid #ddd',
        boxSizing: 'border-box',
        color: 'black',
        cursor: 'pointer',
        display: 'block',
        fontFamily: 'inconsolata, monospace',
        fontSize: 14,
        ':hover': {
          background: 'lightBlue',
        },
        ':focus': {
          outline: '1px inset blue',
        },
        height: 30,
        lineHeight: 1,
        padding: '6px 15px',
        textDecoration: 'none',
        textAlign: 'left',
        margin: '0 5px',
        borderRadius: 3,
        textTransform: 'uppercase',
      }}
      {...props}
    >
      {children}
    </button>
  )
}
