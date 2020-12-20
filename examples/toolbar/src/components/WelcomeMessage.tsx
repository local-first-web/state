/** @jsxImportSource @emotion/react */
import { Group } from './Group'

export const WelcomeMessage: React.FunctionComponent<{ name: string }> = ({ name }) => {
  return (
    <Group>
      <label>Welcome, {name}!</label>
    </Group>
  )
}
