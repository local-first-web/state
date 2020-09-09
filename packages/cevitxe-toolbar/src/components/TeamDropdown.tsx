import React from 'react'
import { Button } from './Button'
import { DropdownWrapper } from './DropdownWrapper'
import { Group } from './Group'
import { Item } from './Item'
import { Team } from 'taco-js'
import pluralize from 'pluralize'
import { InviteButton } from './InviteButton'

export const TeamDropdown: React.FunctionComponent<{ team?: Team }> = ({ team }) => {
  if (team === undefined) return <React.Fragment />

  const members = team.members()
  const memberCount = members.length
  return (
    <DropdownWrapper buttonText="👪 Team" disabled={false}>
      <div className="py-2 px-4">
        <h3 className="font-bold">
          {memberCount} {pluralize('members', memberCount)}
        </h3>
      </div>
      {members.map(member => (
        <Item>
          {member.userName}
          {member.roles?.includes('admin') ? ' 👑' : ''}
        </Item>
      ))}
      <div className="py-2 px-4">
        <InviteButton />
      </div>
    </DropdownWrapper>
  )
}
