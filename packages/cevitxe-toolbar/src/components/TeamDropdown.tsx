import pluralize from 'pluralize'
import React from 'react'
import { Team } from 'taco-js'
import { Dropdown } from './Dropdown'
import { Item } from './Item'

export const TeamDropdown: React.FunctionComponent<{ team?: Team }> = ({ team }) => {
  if (team === undefined) return <React.Fragment />

  const members = team.members()
  const memberCount = members.length
  return (
    <Dropdown buttonText="👪 Team" disabled={false}>
      <div className="py-2 px-4">
        <h3 className="font-bold">
          {memberCount} {pluralize('members', memberCount)}
        </h3>
      </div>
      {members.map((member: any) => (
        <Item>
          {member.userName}
          {member.roles?.includes('admin') ? ' 👑' : ''}
        </Item>
      ))}
    </Dropdown>
  )
}
