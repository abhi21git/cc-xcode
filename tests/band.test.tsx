import { expect, mock, test } from 'claude-code/testing'

const answers: Record<string, unknown> = {
  XcodeListWorkspaces: { message: '* workspaceIdentifier: workspace-test, workspacePath: /tmp/App/App.xcodeproj' },
  XcodeListSchemes: { activeSchemeName: 'App', schemes: [{ disambiguatedName: 'App' }, { disambiguatedName: 'Widget' }] },
  XcodeListRunDestinations: { activeDestinationDisplayTitle: 'iPhone Duo', destinations: [{ displayTitle: 'iPhone Duo' }] },
  BuildProject: { buildResult: 'The project built successfully.', elapsedTime: 1, errors: [] },
  GetBuildLog: { buildIsRunning: false, buildLogEntries: [] },
}

test('scheme pill opens its choices, a choice switches and closes them', async ($, on) => {
  mock.clock(on)
  const calls: { tool: string; args: unknown }[] = []
  on('session.cwd', () => ({ value: '/tmp/App' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '/tmp/App/App.xcodeproj\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('mcp.call', ($, e) => {
    calls.push({ tool: e.tool, args: e.args })
    return { value: { content: [], isError: false, structuredContent: answers[e.tool] } }
  })

  const pane = await $.ui.mount({ plugin: 'cc-xcode', surface: 'terminal', component: 'Pane', requestId: 'xcode', props: { title: 'Xcode', isFocused: true, bodyColumns: 80 } as never })
  await pane.post({}, { in: 'run-build' })
  const band = await $.ui.mount({ plugin: 'cc-xcode', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false } as never })

  // The terminal draws the pills with pills.tsx, which posts the pressed pill's key.
  expect(await band.find({ key: 'choice-pills-0' })).toBeUndefined()
  await band.post({ press: 'scheme' }, { in: 'band-pills' })
  expect(await band.find({ key: 'choice-pills-0' })).toBeDefined()
  await band.post({ press: 'choice-Widget' }, { in: 'choice-pills-0' })
  expect(calls.find(c => c.tool === 'XcodeSwitchScheme')?.args).toEqual({ workspaceIdentifier: 'workspace-test', schemeName: 'Widget' })
  expect(await band.find({ key: 'choice-pills-0' })).toBeUndefined()
})
