import { Label } from './Label'
import React from 'react'
import { Group } from './Group'
export const WelcomeMessage: React.FunctionComponent<{ name: string }> = ({ name }) => {
  return (
    <Group>
      <Label>Welcome, {name}!</Label>
    </Group>
  )
}
