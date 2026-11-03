import { expect, mock, test } from 'claude-code/testing'

const FILE = 'App/App/ContentView.swift'
const SNAP = '/tmp/snap.png'

const answers: Record<string, unknown> = {
  XcodeListWorkspaces: { message: '* workspaceIdentifier: workspace-1, workspacePath: /tmp/App/App.xcodeproj' },
  XcodeGlob: { matches: ['App/App/ContentView.swift', 'Other/ContentView.swift'] },
  RenderPreview: {
    displayName: 'ContentView',
    errors: [],
    renderedDestination: { deviceModelName: 'iPhone Duo', platformName: 'iOS', systemVersion: '27.1' },
  },
}

const PANE_PROPS = { title: 'Canvas', isFocused: true, bodyColumns: 60 } as never

// Xcode 27.2 returns `snapshot.path`; older Xcode returns `previewSnapshotPath`.
for (const [surface, shot] of [
  ['terminal', { snapshot: { path: SNAP } }],
  ['desktop', { snapshot: { path: SNAP } }],
  ['terminal', { previewSnapshotPath: SNAP }],
] as const) {
  test(`/preview renders into history (${surface}, ${Object.keys(shot)[0]})`, async ($, on) => {
    const clock = mock.clock(on)
    const args: Record<string, unknown>[] = []
    on('session.cwd', () => ({ value: '/tmp/App' }))
    on('mcp.call', ($, e) => {
      if (e.tool === 'RenderPreview') args.push(e.args)
      const answer = e.tool === 'RenderPreview' ? { ...(answers.RenderPreview as object), ...shot } : answers[e.tool]
      return { value: { content: [], isError: false, structuredContent: answer } }
    })
    on('process.run', () => ({
      value: { exitCode: 0, stdout: 'pixelWidth: 100\npixelHeight: 200', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    }))
    on('fs.read', () => ({ value: { base64: 'AAAA' } }))
    on('ui.open', () => ({ value: { isPlaced: true } }))

    const pane = await $.ui.mount({ plugin: 'cc-xcode', surface, component: 'Pane', requestId: 'xcode', props: PANE_PROPS })
    await $.command.run({ command: 'preview', args: '/tmp/App/App/ContentView.swift' } as never)
    await clock.advance(10)

    expect(args[0]).toEqual({ sourceFilePath: FILE, workspaceIdentifier: 'workspace-1' })
    expect(await pane.find({ text: /ContentView · iPhone Duo, iOS 27.1 · 1\/1/ })).toBeDefined()
  })
}

for (const input of ['@App/ContentView.swift', 'contentview.swift', 'App/ContentView.swift']) {
  test(`/preview resolves '${input}' to the project path`, async ($, on) => {
    const clock = mock.clock(on)
    const args: Record<string, unknown>[] = []
    on('session.cwd', () => ({ value: '/tmp/App' }))
    on('mcp.call', ($, e) => {
      if (e.tool === 'RenderPreview' || e.tool === 'XcodeGlob') args.push(e.args)
      return { value: { content: [], isError: false, structuredContent: answers[e.tool] } }
    })
    on('process.run', () => ({
      value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    }))
    on('fs.read', () => ({ value: { base64: 'AAAA' } }))
    on('ui.open', () => ({ value: { isPlaced: true } }))

    await $.command.run({ command: 'preview', args: input } as never)
    await clock.advance(10)

    // XcodeGlob caps results at 100, so the pattern must name the file, matching any case.
    expect(args[0]).toEqual({ pattern: '**/[cC][oO][nN][tT][eE][nN][tT][vV][iI][eE][wW].[sS][wW][iI][fF][tT]', workspaceIdentifier: 'workspace-1' })
    expect(args[1]).toEqual({ sourceFilePath: FILE, workspaceIdentifier: 'workspace-1' })
  })
}

test('search finds a #Preview file and renders it', async ($, on) => {
  const clock = mock.clock(on)
  const args: Record<string, unknown>[] = []
  on('session.cwd', () => ({ value: '/tmp/App' }))
  on('mcp.call', ($, e) => {
    if (e.tool === 'RenderPreview') args.push(e.args)
    const answer = e.tool === 'RenderPreview' ? { ...(answers.RenderPreview as object), snapshot: { path: SNAP } } : answers[e.tool]
    return { value: { content: [], isError: false, structuredContent: answer } }
  })
  on('process.run', ($, e) => ({
    value: {
      exitCode: 0,
      stdout: e.argv[0] === 'grep' ? '/tmp/App/App/ContentView.swift\n/tmp/App/App/DetailView.swift\n' : 'pixelWidth: 100\npixelHeight: 200',
      stderr: '', isStdoutTruncated: false, isStderrTruncated: false,
    },
  }))
  on('fs.read', () => ({ value: { base64: 'AAAA' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  const pane = await $.ui.mount({ plugin: 'cc-xcode', surface: 'terminal', component: 'Pane', requestId: 'xcode', props: { title: 'Xcode', isFocused: true, bodyColumns: 60 } as never })
  await pane.post({ press: 'tab-preview' }, { in: 'tab-pills' })
  await pane.input({ key: 'preview-search', text: 'content', kind: 'change' })
  expect(await pane.find({ key: 'hit-App/DetailView.swift' })).toBeUndefined()
  await pane.press({ key: 'hit-App/ContentView.swift' })

  await clock.advance(10)

  expect(args[0]).toEqual({ sourceFilePath: FILE, workspaceIdentifier: 'workspace-1' })
  expect(await pane.find({ text: /ContentView · iPhone Duo, iOS 27.1 · 1\/1/ })).toBeDefined()
})
