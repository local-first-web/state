import React from 'react'
import { Button } from './Button'
import { DropdownWrapper } from './DropdownWrapper'
import { Group } from './Group'
import { Item } from './Item'

export const TeamDropdown: React.FunctionComponent<any> = () => {
  return (
    <Group>
      <DropdownWrapper buttonText="👪 Team" disabled={false}>
        <div className="py-2 px-4">
          <h3 className="font-bold">3 members</h3>
        </div>
        <Item>funny.coyote 👑</Item>
        <Item>little.snake</Item>
        <Item>mysterious.mongoose</Item>
        <div className="py-2 px-4">
          <Button>💌 Invite</Button>
        </div>
      </DropdownWrapper>
    </Group>
  )
}
