import React from 'react'

export const ProgressBar = ({ width = 100, height = 20, percentComplete }: ProgressBarProps) => (
  <div
    className="bg-gray-200 ml-3 rounded-sm"
    style={{ width, height, marginTop: (30 - height) / 2 }}
  >
    <div
      className="bg-blue-500 rounded-sm"
      style={{ width: (width * percentComplete) / 100, height }}
    />
  </div>
)

export interface ProgressBarProps {
  percentComplete: number
  width?: number
  height?: number
}
