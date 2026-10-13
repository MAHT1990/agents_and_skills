import { expect, test } from 'claude-code/testing'
import type { RenderElement } from 'claude-code'

const PLUGIN = 'todo-tree-pane'
const PANE = {
  component: 'Pane' as const,
  requestId: 'todo-tree',
  props: {
    title: 'Todo Tree',
    isFocused: false,
    bodyColumns: 60,
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

test('tasks created and updated are drawn as a tree', async ($, on) => {
  const ids = new Map([
    ['Parent', 't1'],
    ['Child', 't2'],
  ])
  on('tool.call', { tool: 'TaskCreate' }, (_$, e) => ({
    result: { task: { id: ids.get(e.subject) ?? 'tx', subject: e.subject } },
  }))
  on('tool.call', { tool: 'TaskUpdate' }, (_$, e) => ({
    result: { success: true, taskId: e.taskId, updatedFields: ['status'] },
  }))

  await $.tool.call({ tool: 'TaskCreate', subject: 'Parent', description: 'the parent' })
  await $.tool.call({ tool: 'TaskCreate', subject: 'Child', description: 'the child' })
  await $.tool.call({ tool: 'TaskUpdate', taskId: 't2', addBlockedBy: ['t1'] })
  await $.tool.call({
    tool: 'TaskUpdate',
    taskId: 't1',
    status: 'in_progress',
    activeForm: 'Working on parent',
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: PLUGIN, surface, ...PANE })
    expect(await ui.find({ type: 'Text', text: /Todo Tree 0\/2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^\[>\] Parent$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^  \[ \] Child$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Working on parent/ })).toBeDefined()
    await ui.unmount()
  }

  await $.tool.call({ tool: 'TaskUpdate', taskId: 't1', status: 'completed' })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /Todo Tree 1\/2/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\[x\] Parent$/ })).toBeDefined()
  await ui.unmount()
})

test('a TodoWrite list replaces the todo rows and keeps task rows', async ($, on) => {
  on('tool.call', { tool: 'TaskCreate' }, (_$, e) => ({
    result: { task: { id: 't9', subject: e.subject } },
  }))
  on('tool.call', { tool: 'TodoWrite' }, (_$, e) => ({
    result: { oldTodos: [], newTodos: e.todos },
  }))

  await $.tool.call({ tool: 'TaskCreate', subject: 'Keep me', description: 'a task' })
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [
      { content: 'Write docs', status: 'pending', activeForm: 'Writing docs' },
      { content: 'Run tests', status: 'completed', activeForm: 'Running tests' },
    ],
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: PLUGIN, surface, ...PANE })
    expect(await ui.find({ type: 'Text', text: /Todo Tree 1\/3/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Keep me/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Write docs/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^\[x\] Run tests$/ })).toBeDefined()
    await ui.unmount()
  }
})

test('/todo-tree demo seeds a three-level tree and /todo-tree clear empties it', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('ui.panes', () => ({ value: [] }))
  const run = (args: string) =>
    $.command.run({
      command: 'todo-tree',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 160 },
    })

  const ran = await run('demo')
  expect(ran.text).toMatch(/demo loaded/)

  const status = await run('status')
  expect(status.text).toMatch(/8 item\(s\) tracked/)
  expect(status.text).toMatch(/fullscreen, 160 columns/)

  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /Todo Tree 2\/8/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\[>\] Ship todo-tree-pane/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^  \[x\] Add tests$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^    \[ \] Check narrow terminals$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\[ \] Write a README$/ })).toBeDefined()
  await ui.unmount()

  await run('clear')
  const empty = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...PANE })
  expect(await empty.find({ type: 'Text', text: /No rows yet/ })).toBeDefined()
  await empty.unmount()
})

test('the pane with nothing tracked says so', async $ => {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /No rows yet/ })).toBeDefined()
  await ui.unmount()
})

test('the band above the prompt lists the open rows of the tree and hides on request', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => h($.ui.resolve(e).Box, {}) as RenderElement)
  on('tool.call', { tool: 'TaskCreate' }, (_$, e) => ({
    result: { task: { id: e.subject === 'Parent' ? 't1' : 't2', subject: e.subject } },
  }))
  on('tool.call', { tool: 'TaskUpdate' }, (_$, e) => ({
    result: { success: true, taskId: e.taskId, updatedFields: ['status'] },
  }))
  on('ui.panes', () => ({ value: [] }))
  const run = (args: string) =>
    $.command.run({
      command: 'todo-tree',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 160 },
    })

  let ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Todo Tree/ })).toBeUndefined()
  await ui.unmount()

  await $.tool.call({ tool: 'TaskCreate', subject: 'Parent', description: 'the parent' })
  await $.tool.call({ tool: 'TaskCreate', subject: 'Child', description: 'the child' })
  await $.tool.call({ tool: 'TaskUpdate', taskId: 't2', addBlockedBy: ['t1'] })
  await $.tool.call({ tool: 'TaskUpdate', taskId: 't1', status: 'in_progress', activeForm: 'Working on parent' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const drawn = await $.ui.mount({ plugin: PLUGIN, surface, ...BAND })
    expect(await drawn.find({ type: 'Text', text: /^Todo Tree 0\/2$/ })).toBeDefined()
    expect(await drawn.find({ type: 'Text', text: /1 running/ })).toBeDefined()
    expect(await drawn.find({ type: 'Text', text: /^ \[>\] Parent · Working on parent$/ })).toBeDefined()
    expect(await drawn.find({ type: 'Text', text: /^   \[ \] Child$/ })).toBeDefined()
    await drawn.unmount()
  }

  await $.tool.call({ tool: 'TaskUpdate', taskId: 't1', status: 'completed' })
  ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Todo Tree 1\/2$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Parent/ })).toBeUndefined()
  await ui.unmount()

  expect((await run('hide')).text).toMatch(/band hidden/)
  ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Todo Tree/ })).toBeUndefined()
  await ui.unmount()

  expect((await run('show')).text).toMatch(/band shown: 2 item\(s\)/)
  expect((await run('status')).text).toMatch(/2 item\(s\) tracked; band shown/)
})

test('the todo tool grows the tree as text and the pane draws it', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => h($.ui.resolve(e).Box, {}) as RenderElement)
  const call = (input: Record<string, unknown>) =>
    $.tool.call({ tool: 'mcp__todo-tree-pane__todo', ...input } as never)
  const text = (ran: unknown) => String((ran as { result?: unknown }).result ?? '')

  expect(text(await call({ action: 'list' }))).toBe('Todo tree is empty.')
  expect(text(await call({ action: 'add', subject: 'Phase one' }))).toContain('Added t1: Phase one')
  expect(text(await call({ action: 'add', subject: 'Decide the logger', parent: 't1' }))).toContain('Added t2')
  expect(text(await call({ action: 'update', id: 't1', status: 'in_progress', activeForm: 'Shipping' }))).toContain('Updated t1')

  const listed = text(await call({ action: 'list' }))
  expect(listed).toContain('[>] t1 Phase one')
  expect(listed).toContain('  [ ] t2 Decide the logger')

  const band = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
  expect(await band.find({ type: 'Text', text: /Todo Tree 0/ })).toBeDefined()
  expect(await band.find({ type: 'Text', text: /Phase one/ })).toBeDefined()
  expect(await band.find({ type: 'Text', text: /Decide the logger/ })).toBeDefined()
  await band.unmount()

  expect(text(await call({ action: 'update', id: 't9', status: 'completed' }))).toBe('Error: no row t9')
  expect(text(await call({ action: 'update', id: 't2', status: 'completed' }))).toContain('[x] t2')
  expect(text(await call({ action: 'clear' }))).toContain('Completed rows removed.')
  expect(text(await call({ action: 'list' }))).toBe('[>] t1 Phase one')
  expect(text(await call({ action: 'remove', id: 't1' }))).toContain('Removed t1')
  expect(text(await call({ action: 'list' }))).toBe('Todo tree is empty.')
})
