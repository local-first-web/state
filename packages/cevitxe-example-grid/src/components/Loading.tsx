import Spinner from 'react-spinkit'
import React from 'react'

export const Loading = () => {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        textAlign: 'center',
        paddingTop: '30%',
      }}
    >
      <span style={{ letterSpacing: 3, fontSize: 10, color: 'gray', textTransform: 'uppercase' }}>
        Loading...
      </span>
      <span style={{ display: 'block', margin: 30 }}>
        <Spinner name="ball-clip-rotate" color="orange" />
      </span>
    </div>
  )
}
