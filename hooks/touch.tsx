// A clear layer over the simulator image that turns clicks into taps and drags into swipes. It draws no
// characters (an empty Box of the image's size), so the picture beneath shows through.
import type { ClientModule } from 'claude-code'

export type TouchPost = { tap: [number, number] } | { swipe: [number, number, number, number] }
type Props = { columns: number; rows: number }
type State = { from?: [number, number] }

const Touch: ClientModule<Props, State> = (props, surface) => {
  const { Box } = surface.elements
  // Positions as fractions of the image, mid-cell when the terminal reports no pixels
  const at = (ev: { x: number; y: number; fine?: { x: number; y: number } }): [number, number] => [
    Math.min(1, Math.max(0, (ev.fine?.x ?? ev.x + 0.5) / props.columns)),
    Math.min(1, Math.max(0, (ev.fine?.y ?? ev.y + 0.5) / props.rows)),
  ]

  surface.onPointer(ev => {
    if (ev.type === 'down' && ev.button === 'left') surface.setState({ from: at(ev) })
    else if (ev.type === 'up' && surface.state?.from) {
      const [x1, y1] = surface.state.from
      const [x2, y2] = at(ev)
      // Under a cell's worth of travel is a tap
      const isTap = Math.abs(x2 - x1) * props.columns < 1 && Math.abs(y2 - y1) * props.rows < 1
      surface.post(isTap ? { tap: [x1, y1] } : { swipe: [x1, y1, x2, y2] })
      surface.setState({})
    } else if (ev.type === 'leave' && surface.state?.from) surface.setState({})
  })

  return <Box width={props.columns} height={props.rows} />
}

export default Touch
