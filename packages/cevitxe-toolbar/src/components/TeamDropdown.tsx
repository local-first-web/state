// import { InviteButton } from './InviteButton'
import pluralize from 'pluralize'
import React from 'react'
import { Team } from 'taco-js'
import { Dropdown } from './Dropdown'
import { DropdownCaret } from './DropdownCaret'
import { DropdownItem } from './DropdownItem'
import { DropdownDivider } from './DropdownDivider'

const TeamDropdown: React.FunctionComponent<{ team?: Team }> = ({ team }) => {
  if (team === undefined) return <React.Fragment />

  const members = team.members()
  const memberCount = members.length

  const button = (
    <>
      👪 Team <DropdownCaret />
    </>
  )

  return (
    <Dropdown button={button}>
      <DropdownItem>
        <h3 className="font-bold">
          {memberCount} {pluralize('members', memberCount)}
        </h3>
      </DropdownItem>
      <DropdownDivider />
      {members.map((member: any) => (
        <DropdownItem>
          {member.userName}
          {member.roles?.includes('admin') ? ' 👑' : ''}
        </DropdownItem>
      ))}
      {/* <DropdownDivider />
      <DropdownItem>
        <InviteButton />
      </DropdownItem> */}
    </Dropdown>
  )
}

export { TeamDropdown }
