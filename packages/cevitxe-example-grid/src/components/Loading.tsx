import Spinner from 'react-spinkit'
import React from 'react'

export const Loading = () => {
  return (
    <div className="text-center mt-5">
      <div className="m-8">
        <Spinner name="ball-clip-rotate" color="blue" />
      </div>
      <div className="text-xs text-gray-500 uppercase text-center" style={{ letterSpacing: 8 }}>
        Loading...
      </div>
    </div>
  )
}
