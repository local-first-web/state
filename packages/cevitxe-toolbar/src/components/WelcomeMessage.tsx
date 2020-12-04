import { Label } from './Label'
import React from 'react'
import { Group } from './Group'

const WelcomeMessage: React.FunctionComponent<{ name: string }> = ({ name }) => {
  return (
    <Group>
      <Label>Welcome, {name}!</Label>
    </Group>
  )
}

export { WelcomeMessage }
