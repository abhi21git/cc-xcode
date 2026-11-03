import { expect, mock, test } from 'claude-code/testing'

const PANE_PROPS = { title: 'Xcode', isFocused: true, bodyColumns: 80 } as never

test('Simulator tab streams screenshots and stops when left', async ($, on) => {
  const clock = mock.clock(on)
  const shots: string[] = []
  on('session.cwd', () => ({ value: '/tmp/App' }))
  on('mcp.call', () => ({ value: { content: [], isError: false, structuredContent: {} } }))
  on('process.run', ($, e) => {
    if (e.argv[1] === 'simctl') shots.push(e.argv.at(-1)!)
    return { value: { exitCode: 0, stdout: 'pixelWidth: 100\npixelHeight: 200', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))

  const pane = await $.ui.mount({ plugin: 'cc-xcode', surface: 'terminal', component: 'Pane', requestId: 'xcode', props: PANE_PROPS })
  await pane.post({ press: 'tab-sim' }, { in: 'tab-pills' })
  await clock.advance(2500)
  expect(shots).toEqual(['/tmp/cc-xcode-sim-0.png', '/tmp/cc-xcode-sim-1.png', '/tmp/cc-xcode-sim-0.png'])
  expect(await pane.find({ key: 'sim' })).toBeDefined()

  await pane.post({ press: 'tab-build' }, { in: 'tab-pills' })
  await clock.advance(3000)
  expect(shots.length).toBe(3)
})

test('a two-screen device retries on its primary display', async ($, on) => {
  const clock = mock.clock(on)
  const shots: string[][] = []
  const TWO = 'Cannot choose between 2 displays. Specify one with --display:\n    --display=3  LCD-1 (primary-1) 2007x2853\n    --display=1  LCD (primary) 1398x2034\nInvalid argument'
  on('session.cwd', () => ({ value: '/tmp/App' }))
  on('mcp.call', () => ({ value: { content: [], isError: false, structuredContent: {} } }))
  on('process.run', ($, e) => {
    const isShot = e.argv[1] === 'simctl'
    if (isShot) shots.push([...e.argv])
    const isRefused = isShot && !e.argv.some(a => a.startsWith('--display='))
    return { value: { exitCode: isRefused ? 1 : 0, stdout: 'pixelWidth: 100\npixelHeight: 200', stderr: isRefused ? TWO : '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))

  const pane = await $.ui.mount({ plugin: 'cc-xcode', surface: 'terminal', component: 'Pane', requestId: 'xcode', props: PANE_PROPS })
  await pane.post({ press: 'tab-sim' }, { in: 'tab-pills' })
  await clock.advance(1500)

  expect(shots[1]).toContain('--display=1')
  expect(await pane.find({ key: 'sim' })).toBeDefined()
  await pane.post({ press: 'tab-build' }, { in: 'tab-pills' })
})

test('a click on the image taps the device in points', async ($, on) => {
  const clock = mock.clock(on)
  const commands: unknown[] = []
  on('session.cwd', () => ({ value: '/tmp/App' }))
  on('mcp.call', ($, e) => {
    if (e.tool === 'DeviceInteractionSynthesize') commands.push(e.args.interactionCommand)
    const answer = e.tool === 'DeviceInteractionStartSession' ? { interactionSessionKey: 'Xcode Mods Simulator' }
      : e.tool === 'DeviceInteractionSynthesize' ? { screenshotPath: '/tmp/points.png' } : {}
    return { value: { content: [], isError: false, structuredContent: answer } }
  })
  on('process.run', ($, e) => {
    const isList = e.argv.includes('list')
    const isPoints = e.argv.includes('/tmp/points.png')
    const stdout = isList ? JSON.stringify({ devices: { 'iOS 27.2': [{ udid: 'ED28' }] } })
      : isPoints ? 'pixelWidth: 402\npixelHeight: 874' : 'pixelWidth: 1206\npixelHeight: 2622'
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))

  const pane = await $.ui.mount({ plugin: 'cc-xcode', surface: 'terminal', component: 'Pane', requestId: 'xcode', props: PANE_PROPS })
  await pane.post({ press: 'tab-sim' }, { in: 'tab-pills' })
  await clock.advance(10)
  await pane.post({ tap: [0.5, 0.5] }, { in: 'sim-touch' })
  await clock.advance(10)

  // The first Synthesize only reads the point size; the second taps the middle.
  expect(commands).toEqual([undefined, 't 201 437'])
  await pane.post({ press: 'tab-build' }, { in: 'tab-pills' })
})
