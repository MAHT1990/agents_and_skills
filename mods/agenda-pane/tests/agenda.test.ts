import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { RenderElement } from 'claude-code'

const PLUGIN = 'agenda-pane'
const TOOL = 'mcp__agenda-pane__agenda'
const PANE = {
  component: 'Pane' as const,
  requestId: 'agenda',
  props: {
    title: 'Agenda',
    isFocused: false,
    bodyColumns: 80,
    placement: 'dock' as const,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
}
const BAND = {
  component: 'AbovePrompt' as const,
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 12,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 11 },
    view: {},
  },
}

const call = ($: Engine, input: Record<string, unknown>) => $.tool.call({ tool: TOOL, ...input } as never)

// A plugin tool answers the model with text.
const text = (ran: unknown) => String((ran as { result?: unknown }).result ?? '')

test('the agenda tool adds, updates, resolves and lists topics as text, drawn above the prompt', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => h($.ui.resolve(e).Box, {}) as RenderElement)
  const added = text(await call($, { action: 'add', title: 'Logger choice', note: 'pino recommended' }))
  expect(added).toMatch(/^Added a1 \[open\]: Logger choice\n/)
  expect(added).toMatch(/\na1 \[open\] Logger choice · pino recommended$/)

  const second = text(await call($, { action: 'add', title: 'Log shipping path', status: 'waiting_user' }))
  expect(second).toMatch(/^Added a2 \[waiting_user\]: Log shipping path\n/)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: PLUGIN, surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /^Agenda 2$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1 on the user/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^ 1\. \[ \] Logger choice · pino recommended$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^ 2\. \[\?\] Log shipping path$/ })).toBeDefined()
    await ui.unmount()
  }

  const resolved = text(await call($, { action: 'resolve', id: 'a1', note: 'nestjs-pino' }))
  expect(resolved).toMatch(/^a1 is now decided: Logger choice\n/)

  const listed = text(await call($, { action: 'list' }))
  expect(listed).toBe('a2 [waiting_user] Log shipping path\na1 [decided] Logger choice · nestjs-pino')

  const band = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await band.find({ type: 'Text', text: /^Agenda 1$/ })).toBeDefined()
  expect(await band.find({ type: 'Text', text: /Logger choice/ })).toBeUndefined()
  await band.unmount()

  const pane = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...PANE })
  expect(await pane.find({ type: 'Text', text: /Agenda 1\/2/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /^2\. \[x\] Logger choice$/ })).toBeDefined()
  await pane.unmount()

  expect(text(await call($, { action: 'update', id: 'a9', status: 'parked' }))).toBe('Error: no topic a9')
  expect(text(await call($, { action: 'add' }))).toBe('Error: add needs a title')
  expect(text(await call($, { action: 'remove', id: 'a1' }))).toMatch(/^Removed a1\n/)
  expect(text(await call($, { action: 'list' }))).toBe('a2 [waiting_user] Log shipping path')
  expect(text(await call($, { action: 'remove', id: 'a2' }))).toBe('Removed a2\nAgenda is empty.')
})

test('/agenda add, wait, done, note, hide, show and clear drive the same list', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => h($.ui.resolve(e).Box, {}) as RenderElement)
  on('ui.panes', () => ({ value: [] }))
  const run = (args: string) =>
    $.command.run({
      command: 'agenda',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 160 },
    })

  expect((await run('add Alert channel')).text).toMatch(/Added a1: Alert channel/)
  expect((await run('add Retention days')).text).toMatch(/Added a2/)
  expect((await run('wait 1')).text).toMatch(/a1 is now waiting on the user/)
  expect((await run('note a2 14 days free tier')).text).toMatch(/Noted on a2/)
  expect((await run('done a2')).text).toMatch(/a2 is now decided/)
  expect((await run('done 9')).text).toMatch(/No agenda row/)
  expect((await run('status')).text).toMatch(/1 live, 1 settled; band shown/)

  let ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^ 1\. \[\?\] Alert channel$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Retention days/ })).toBeUndefined()
  await ui.unmount()

  expect((await run('hide')).text).toMatch(/band hidden/)
  ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Agenda/ })).toBeUndefined()
  await ui.unmount()

  expect((await run('show')).text).toMatch(/band shown: 1 under discussion/)
  const pane = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...PANE })
  expect(await pane.find({ type: 'Text', text: /^2\. \[x\] Retention days$/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /14 days free tier/ })).toBeDefined()
  await pane.unmount()

  expect((await run('clear')).text).toMatch(/1 left/)
  ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Agenda 1$/ })).toBeDefined()
  await ui.unmount()
})

test('/agenda demo seeds the band with the live rows and the pane with all four', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => h($.ui.resolve(e).Box, {}) as RenderElement)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => h($.ui.resolve(e).Box, {}) as RenderElement)
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('ui.panes', () => ({ value: [] }))
  const run = (args: string) =>
    $.command.run({
      command: 'agenda',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 160 },
    })

  const empty = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await empty.find({ type: 'Text', text: /Agenda/ })).toBeUndefined()
  await empty.unmount()

  expect((await run('demo')).text).toMatch(/demo loaded/)
  const seeded = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', ...BAND })
  expect(await seeded.find({ type: 'Text', text: /^Agenda 2$/ })).toBeDefined()
  expect(await seeded.find({ type: 'Text', text: /^ 1\. \[ \] Log shipping/ })).toBeDefined()
  expect(await seeded.find({ type: 'Text', text: /^ 2\. \[\?\] Logger/ })).toBeDefined()
  expect(await seeded.find({ type: 'Text', text: /Usage metrics/ })).toBeUndefined()
  await seeded.unmount()

  expect((await run('pane')).text).toMatch(/pane opened/)
  const pane = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...PANE })
  expect(await pane.find({ type: 'Text', text: /Agenda 2\/4/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /^3\. \[-\] Usage metrics pipeline$/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /^4\. \[x\] Built-in dashboard vs Grafana$/ })).toBeDefined()
  await pane.unmount()
})
