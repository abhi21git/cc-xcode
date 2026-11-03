// A row of separate pills, drawn here rather than as Buttons (as cc-vibecheck's settings do): a Button is
// inverted under the pointer and while focused, which the pills' rounded ends cannot follow
import type { ClientModule } from 'claude-code'

export type PillItem = { key: string; label: string; isOn: boolean }
type Props = { items: PillItem[]; colors: { track: string; on: string; onFg: string } }
type State = { hover?: number }

const cells = (s: string) => [...s].reduce((n, ch) => n + (/\p{Emoji_Presentation}/u.test(ch) ? 2 : 1), 0)

const Pills: ClientModule<Props, State> = (props, surface) => {
  const { Text } = surface.elements
  const { items, colors: c } = props
  // Each pill: two caps around ` label `, one column between pills
  let x = 0
  const spans = items.map(it => {
    const span = { from: x, to: x + cells(it.label) + 4 }
    x = span.to + 1
    return span
  })
  const hover = surface.state?.hover

  surface.onPointer(ev => {
    const i = spans.findIndex(s => ev.x >= s.from && ev.x < s.to)
    const over = i >= 0 ? i : undefined
    if (ev.type === 'down' && ev.button === 'left' && over !== undefined && !items[over]!.isOn) surface.post({ press: items[over]!.key })
    else if ((ev.type === 'enter' || ev.type === 'move') && over !== hover) surface.setState({ hover: over })
    else if (ev.type === 'leave' && hover !== undefined) surface.setState({})
  })

  return (
    <Text>
      {items.map((it, i) => {
        const isLit = it.isOn || i === hover
        const bg = isLit ? c.on : c.track
        return (
          <Text key={it.key}>
            {i > 0 && ' '}
            <Text color={bg}>{'\ue0b6'}</Text>
            <Text backgroundColor={bg} color={isLit ? c.onFg : 'text'} bold={isLit}>
              {` ${it.label} `}
            </Text>
            <Text color={bg}>{'\ue0b4'}</Text>
          </Text>
        )
      })}
    </Text>
  )
}

export default Pills
