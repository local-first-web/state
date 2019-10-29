/** @jsx jsx */
import { css, jsx } from '@emotion/core'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export const OnlineIndicator = () => {
  const isOnline = useNetworkStatus()

  const onlineWrapper = css`
    display: flex;
    justify-item-self: flex-end;
    margin: 4px 8px 0 0;
    color: ${isOnline ? 'green' : 'lightgray'};
  `

  const onlineIndicator = css`
    width: 15px;
    height: 15px;
    margin: 6px 4px 0 0;
    border-radius: 15px;
    -moz-border-radius: 15px;
    -webkit-border-radius: 15px;
    background-color: ${isOnline ? 'lime' : 'lightgray'};
  `

  return (
    <span css={onlineWrapper}>
      <div css={onlineIndicator} />
      {isOnline ? 'online' : 'offline'}
    </span>
  )
}
