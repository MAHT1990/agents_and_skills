import { expect, test } from 'claude-code/testing'
import type { RenderElement } from 'claude-code'

const PLUGIN = 'waiting-pane'
const PANE = {
  component: 'Pane' as const,
  requestId: 'waiting',
  props: {
    title: 'Waiting',
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
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 11 },
    view: {},
  },
}

const envelope = (from: string, name: string, body: string) =>
  `<cross-session-message from="${from}" from-name="${name}" from-mode="prompting">\n${body}\n</cross-session-message>`

test('a SendMessage call is listed above the prompt until that peer replies', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => h($.ui.resolve(e).Box, {}) as RenderElement)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true, message: 'sent' } }))
  on('session.receive', (_$, e) => ({ text: e.text }))

  await $.tool.call({
    tool: 'SendMessage',
    to: 'lab-nest [2e7a80]',
    summary: 'Scenario 7 decision',
    message: '[book-forward → lab-nest] decide scenario 7',
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: PLUGIN, surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /^Waiting 1$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^ \[\.\.\] lab-nest \[2e7a80\] · Scenario 7 decision \(0m\)$/ })).toBeDefined()
    await ui.unmount()
  }

  await $.session.receive({
    origin: { kind: 'peer-send-message' },
    text: envelope('bridge:session_01A', 'lab-nest', '[lab-nest → book-forward] 7 applied, hook added'),
  })

  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Waiting 0$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^ \[ok\] lab-nest \[2e7a80\] · \d\d:\d\d · \[lab-nest → book-forward\] 7 applied, hook added$/ })).toBeDefined()
  await ui.unmount()

  const pane = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...PANE })
  expect(await pane.find({ type: 'Text', text: /Waiting 0\/1/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /^1\. \[ok\] lab-nest \[2e7a80\] · Scenario 7 decision$/ })).toBeDefined()
  await pane.unmount()
})

test('a reply from another peer leaves the row waiting, and the address matches too', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => h($.ui.resolve(e).Box, {}) as RenderElement)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  on('session.receive', (_$, e) => ({ text: e.text }))

  await $.tool.call({
    tool: 'SendMessage',
    to: 'bridge:session_01B',
    summary: 'Tree released',
    message: 'first line\nsecond line',
  })
  await $.tool.call({ tool: 'SendMessage', to: 'main', summary: 'ignored', message: 'to the main conversation' })

  await $.session.receive({
    origin: { kind: 'peer-send-message' },
    text: envelope('bridge:session_01C', 'lab-nest-gitter', 'unrelated report'),
  })
  let ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Waiting 1$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\[\.\.\] bridge:session_01B · Tree released/ })).toBeDefined()
  await ui.unmount()

  await $.session.receive({
    origin: { kind: 'peer-send-message' },
    text: envelope('bridge:session_01B', 'lab-clients', 'tree matches'),
  })
  ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Waiting 0$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\[ok\] bridge:session_01B · .* · tree matches/ })).toBeDefined()
  await ui.unmount()
})

test('/waiting done, clear, hide and show drive the band', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => h($.ui.resolve(e).Box, {}) as RenderElement)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  on('ui.panes', () => ({ value: [] }))
  const run = (args: string) =>
    $.command.run({
      command: 'waiting',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 160 },
    })

  await $.tool.call({ tool: 'SendMessage', to: 'lab-clients', summary: 'first order', message: 'one' })
  await $.tool.call({ tool: 'SendMessage', to: 'lab-nest', summary: 'second order', message: 'two' })

  expect((await run('done 1')).text).toMatch(/Marked 1 row\(s\) done/)
  expect((await run('done lab-nest')).text).toMatch(/Marked 1 row\(s\) done/)
  expect((await run('done lab-nest')).text).toMatch(/Nothing waiting matches/)
  expect((await run('status')).text).toMatch(/0 waiting, 2 settled; band shown/)

  let ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Waiting 0$/ })).toBeDefined()
  await ui.unmount()

  expect((await run('hide')).text).toMatch(/band hidden/)
  ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Waiting/ })).toBeUndefined()
  await ui.unmount()

  expect((await run('show')).text).toMatch(/band shown: 0 waiting/)
  expect((await run('clear')).text).toMatch(/0 still waiting/)
  ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Waiting/ })).toBeUndefined()
  await ui.unmount()

  const pane = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...PANE })
  expect(await pane.find({ type: 'Text', text: /Nothing pending/ })).toBeDefined()
  await pane.unmount()
})

test('/waiting demo seeds the band and the pane shows every row', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => h($.ui.resolve(e).Box, {}) as RenderElement)
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('ui.panes', () => ({ value: [] }))
  const run = (args: string) =>
    $.command.run({
      command: 'waiting',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 160 },
    })

  expect((await run('demo')).text).toMatch(/demo loaded/)
  const seeded = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', ...BAND })
  expect(await seeded.find({ type: 'Text', text: /^Waiting 2$/ })).toBeDefined()
  expect(await seeded.find({ type: 'Text', text: /^ \[\.\.\] lab-clients-gitter · UI removal/ })).toBeDefined()
  expect(await seeded.find({ type: 'Text', text: /^ \[ok\] lab-clients · \d\d:\d\d · \[lab-clients → book-forward\]/ })).toBeDefined()
  expect(await seeded.find({ type: 'Text', text: /book-forward-gitter/ })).toBeUndefined()
  await seeded.unmount()

  expect((await run('pane')).text).toMatch(/pane opened/)
  const pane = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...PANE })
  expect(await pane.find({ type: 'Text', text: /Waiting 2\/4/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /\[--\] book-forward-gitter · Issue body line/ })).toBeDefined()
  await pane.unmount()
})
