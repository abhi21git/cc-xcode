// A tall outlined button, like cc-vibecheck's Done, drawn here rather than as a Button: a Button is
// inverted under the pointer and while focused; this one only colours its outline and label
import type { ClientModule } from 'claude-code'

type Props = { label: string; isPrimary?: boolean }
type State = { isHover?: boolean }

const cells = (s: string) => [...s].reduce((n, ch) => n + (/\p{Emoji_Presentation}/u.test(ch) ? 2 : 1), 0)

const BigButton: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  const isHover = surface.state?.isHover ?? false

  surface.onPointer(ev => {
    if (ev.type === 'down' && ev.button === 'left') surface.post({})
    else if ((ev.type === 'enter' || ev.type === 'move') && !isHover) surface.setState({ isHover: true })
    else if (ev.type === 'leave' && isHover) surface.setState({ isHover: false })
  })

  const edge = isHover || props.isPrimary ? 'suggestion' : 'inactive'
  const line = '─'.repeat(cells(props.label) + 4)
  return (
    <Box flexDirection="column">
      <Text color={edge}>{`╭${line}╮`}</Text>
      <Text>
        <Text color={edge}>│</Text>
        <Text color={isHover ? 'suggestion' : 'text'} bold={isHover}>{`  ${props.label}  `}</Text>
        <Text color={edge}>│</Text>
      </Text>
      <Text color={edge}>{`╰${line}╯`}</Text>
    </Box>
  )
}

export default BigButton
