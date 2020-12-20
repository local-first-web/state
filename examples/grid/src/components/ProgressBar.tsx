/** @jsxImportSource @emotion/react */

export const ProgressBar = ({ width = 100, height = 20, percentComplete }: ProgressBarProps) => (
  <div css={{ background: '#ddd', width, height, borderRadius: 3, marginTop: (30 - height) / 2 }}>
    <div
      css={{
        background: 'orange',
        width: (width * percentComplete) / 100,
        height,
        borderRadius: 3,
      }}
    />
  </div>
)

export interface ProgressBarProps {
  percentComplete: number
  width?: number
  height?: number
}
