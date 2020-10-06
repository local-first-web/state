import React from 'react'

export const StatusLight = ({ online }: { online: boolean }) => (
  <div style={{ display: 'inline-block' }}>
    <span
      style={{
        display: 'block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        border: '1px solid white',
        background: online ? 'green' : 'silver',
      }}
    ></span>
  </div>
)
