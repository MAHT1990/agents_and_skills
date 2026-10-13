import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { TodoItem, TodoStatus } from '../types'

const PLUGIN = 'todo-tree-pane'
const PANE = 'todo-tree'
const TITLE = 'Todo Tree'
const TOOL = 'todo'
// The name the model calls the tool by, as the engine lists a plugin's tool.
const TOOL_ID = `mcp__${PLUGIN}__${TOOL}`
// How many open rows the band above the prompt lists before "+n more".
const BAND_ROWS = 6

const items = atom({ plugin: 'todo-tree-pane', key: 'items' } as const, [])
const band = atom({ plugin: 'todo-tree-pane', key: 'band' } as const, true)
const seq = atom({ plugin: 'todo-tree-pane', key: 'seq' } as const, 0)

const SPEC = {
  name: TOOL,
  description:
    'Keeps the Todo Tree drawn above the prompt: the plan of the current work as a tree. ' +
    '"add" a row (subject; optional parent id to hang it under, status, activeForm); ' +
    '"update" a row (id, then status pending|in_progress|completed, subject, activeForm, parent; parent "none" makes it a root); ' +
    '"remove" a row (id); "list" the tree; "clear" the completed rows. ' +
    'Ids are t1, t2, ... as add and list answer them. Keep subjects to one short line.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['add', 'update', 'remove', 'list', 'clear'] },
      id: { type: 'string', description: 'The row id (t1, t2, ...) for update and remove' },
      subject: { type: 'string', description: 'The row, one short line' },
      parent: { type: 'string', description: 'The id of the row this one hangs under; "none" for a root' },
      status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
      activeForm: { type: 'string', description: 'What is being done while in_progress, one short line' },
    },
    required: ['action'],
  },
}

type Row = { item: TodoItem; depth: number }

// What `/todo-tree demo` fills the tree with: a three-level tree across the
// three statuses, enough to see the layout without any real task.
const DEMO: TodoItem[] = [
  { id: 'd1', subject: 'Ship todo-tree-pane v0.1', status: 'in_progress', blockedBy: [], activeForm: 'Shipping the pane', source: 'task' },
  { id: 'd2', subject: 'Write the hooks module', status: 'completed', blockedBy: ['d1'], source: 'task' },
  { id: 'd3', subject: 'Add tests', status: 'completed', blockedBy: ['d1'], source: 'task' },
  { id: 'd4', subject: 'Try it in a live session', status: 'in_progress', blockedBy: ['d1'], activeForm: 'Opening the pane beside the transcript', source: 'task' },
  { id: 'd5', subject: 'Check narrow terminals', status: 'pending', blockedBy: ['d4'], source: 'task' },
  { id: 'd6', subject: 'Check the desktop surface', status: 'pending', blockedBy: ['d4'], source: 'task' },
  { id: 'd7', subject: 'Publish to a marketplace', status: 'pending', blockedBy: ['d1'], source: 'task' },
  { id: 'todo:0', subject: 'Write a README', status: 'pending', blockedBy: [], activeForm: 'Writing a README', source: 'todo' },
]

const isStatus = (value: unknown): value is TodoStatus =>
  value === 'pending' || value === 'in_progress' || value === 'completed'

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((one): one is string => typeof one === 'string') : []

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

// Lays the flat list out as a tree: an item hangs under the first blocker the
// list knows; an item blocked by nothing known is a root. A cycle ends at the
// first repeat, and whatever the walk missed is appended at the root level.
const layout = (list: TodoItem[]): Row[] => {
  const known = new Set(list.map(one => one.id))
  const parentOf = (one: TodoItem) => one.blockedBy.find(id => known.has(id) && id !== one.id)
  const rows: Row[] = []
  const seen = new Set<string>()
  const walk = (parent: string | undefined, depth: number) => {
    for (const one of list) {
      if (seen.has(one.id) || parentOf(one) !== parent) continue
      seen.add(one.id)
      rows.push({ item: one, depth })
      walk(one.id, depth + 1)
    }
  }
  walk(undefined, 0)
  for (const one of list) {
    if (!seen.has(one.id)) {
      seen.add(one.id)
      rows.push({ item: one, depth: 0 })
    }
  }
  return rows
}

const glyph = (status: TodoStatus) =>
  status === 'completed' ? '[x]' : status === 'in_progress' ? '[>]' : '[ ]'

// Writes the list; a failure is logged and never reaches the tool call the
// hook is relaying, so a broken drawing cannot break the model's task tools.
const record = async ($: EngineInterface, fn: (list: TodoItem[]) => TodoItem[]) => {
  try {
    await update($, items, fn)
  } catch (err) {
    $.ui.log(`todo-tree-pane: state write failed: ${String(err)}`, { to: 'debug' })
  }
}

// Opens the docked pane as the person's own request (/todo-tree pane). A pane
// the session opened unasked may be waiting undrawn on a narrow terminal;
// closing it first lets this asked open seat it at the current width.
const show = async ($: EngineInterface) => {
  const mine = (await $.ui.panes()).find(pane => pane.id === PANE)
  if (mine && !mine.isPlaced) await $.ui.close({ id: PANE })
  return $.ui.open({ id: PANE, title: TITLE })
}

// Keeps the list in its earlier order after an update replaced one entry.
const byOrder = (before: TodoItem[]) => {
  const index = new Map(before.map((one, at) => [one.id, at] as const))
  return (a: TodoItem, b: TodoItem) =>
    (index.get(a.id) ?? before.length) - (index.get(b.id) ?? before.length)
}

// The tree as the model reads it: one line per row, indented as drawn.
const listing = (list: TodoItem[]) =>
  list.length === 0
    ? 'Todo tree is empty.'
    : layout(list)
        .map(({ item, depth }) => `${'  '.repeat(depth)}${glyph(item.status)} ${item.id} ${item.subject}`)
        .join('\n')

// The model keeps the tree through this tool; the engine takes the result as
// text, so every answer is a line, then the tree.
const runTodoTool = async ($: EngineInterface, raw: Record<string, unknown>) => {
  try {
    const input = asRecord(raw.input) ?? raw
    const action = asText(input.action) ?? 'list'
    const id = asText(input.id)
    const subject = asText(input.subject)
    const parent = asText(input.parent)
    const activeForm = asText(input.activeForm)
    const status = isStatus(input.status) ? input.status : undefined
    const answer = async (head: string) => ({ result: `${head}\n${listing(await read($, items))}` })

    if (action === 'add') {
      if (!subject) return { result: 'Error: add needs a subject' }
      await update($, seq, n => n + 1)
      const created: TodoItem = {
        id: `t${await read($, seq)}`,
        subject,
        status: status ?? 'pending',
        blockedBy: parent && parent !== 'none' ? [parent] : [],
        activeForm,
        source: 'task',
      }
      await record($, list => [...list, created])
      return answer(`Added ${created.id}: ${created.subject}`)
    }
    if (action === 'update') {
      if (!id) return { result: 'Error: update needs an id' }
      let found = false
      await record($, list =>
        list.map(one => {
          if (one.id !== id) return one
          found = true
          return {
            ...one,
            subject: subject ?? one.subject,
            status: status ?? one.status,
            activeForm: activeForm ?? one.activeForm,
            blockedBy: parent === undefined ? one.blockedBy : parent === 'none' ? [] : [parent],
          }
        }),
      )
      return found ? answer(`Updated ${id}`) : { result: `Error: no row ${id}` }
    }
    if (action === 'remove') {
      if (!id) return { result: 'Error: remove needs an id' }
      let found = false
      await record($, list => {
        found = list.some(one => one.id === id)
        return list.filter(one => one.id !== id)
      })
      return found ? answer(`Removed ${id}`) : { result: `Error: no row ${id}` }
    }
    if (action === 'clear') {
      await record($, list => list.filter(one => one.status !== 'completed'))
      return answer('Completed rows removed.')
    }
    return { result: listing(await read($, items)) }
  } catch (err) {
    $.ui.log(`${PLUGIN}: tool call failed: ${String(err)}`, { to: 'debug' })
    return { result: `Error: ${String(err)}` }
  }
}

// The /todo-tree command: the band by default, the docked pane on request.
const runTodoTree = async (
  $: EngineInterface,
  e: { args?: string; presentation: { isFullscreen: boolean; columns: number } },
) => {
  const arg = (e.args ?? '').trim()
  if (arg === 'hide') {
    await update($, band, () => false)
    return { text: 'Todo tree band hidden. /todo-tree show brings it back.' }
  }
  if (arg === 'pane') {
    const opened = await show($)
    return {
      text: opened.isPlaced
        ? 'Todo tree pane opened.'
        : `Todo tree pane is waiting for room: ${opened.reason}`,
    }
  }
  if (arg === 'clear') {
    await update($, items, () => [])
    return { text: 'Todo tree cleared.' }
  }
  if (arg === 'close') {
    await $.ui.close({ id: PANE })
    return { text: 'Todo tree pane closed.' }
  }
  if (arg === 'status') {
    const panes = await $.ui.panes()
    const count = (await read($, items)).length
    const where = e.presentation.isFullscreen ? 'fullscreen' : 'main screen'
    const lines = [
      `todo-tree-pane: ${count} item(s) tracked; band ${(await read($, band)) ? 'shown' : 'hidden'}`,
      `terminal: ${where}, ${e.presentation.columns} columns`,
      panes.length === 0
        ? 'panes: none open'
        : `panes: ${panes
            .map(
              pane =>
                `${pane.id} (${pane.isPlaced ? 'placed' : 'waiting'}${pane.isShown ? ', shown' : ''})`,
            )
            .join(', ')}`,
    ]
    return { text: lines.join('\n') }
  }
  if (arg === 'demo') {
    await record($, () => DEMO)
    await update($, band, () => true)
    return { text: 'Todo tree demo loaded above the prompt. Run /todo-tree clear to remove it.' }
  }
  if (arg === 'sync') {
    // The plugin's own TaskList hook sees this call and records its result.
    try {
      await $.tool.call({ tool: 'TaskList' })
    } catch (err) {
      return { text: `Todo tree sync failed: ${String(err)}` }
    }
    const count = (await read($, items)).length
    await update($, band, () => true)
    return { text: `Todo tree synced: ${count} item(s).` }
  }

  // `/todo-tree` and `/todo-tree show`: the band above the prompt.
  await update($, band, () => true)
  const count = (await read($, items)).length
  return { text: `Todo tree band shown: ${count} item(s).` }
}


export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register(SPEC)
    await $.command.register({
      name: 'todo-tree',
      description: 'Show the task/todo tree above the prompt',
      argumentHint: 'hide | show | pane | demo | sync | status | clear | close',
    })

    return next(e)
  })

  on('command.run', { command: 'todo-tree' }, ($, e) => runTodoTree($, e))

  on('tool.call', { tool: new RegExp(`^${TOOL_ID}$`) }, ($, e) => runTodoTool($, Object(e)))

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    const task = asRecord(asRecord(ran.result)?.task)
    const id = typeof task?.id === 'string' ? task.id : undefined
    if (id && !ran.isError) {
      const subject = typeof task?.subject === 'string' ? task.subject : e.subject
      const created: TodoItem = {
        id,
        subject,
        status: 'pending',
        blockedBy: [],
        activeForm: e.activeForm,
        source: 'task',
      }
      await record($, list => [...list.filter(one => one.id !== id), created])
    }

    return ran
  })

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    const ok = asRecord(ran.result)?.success === true && !ran.isError
    if (ok) {
      await record($, list => {
        if (e.status === 'deleted') return list.filter(one => one.id !== e.taskId)
        const found = list.find(one => one.id === e.taskId)
        const base: TodoItem = found ?? {
          id: e.taskId,
          subject: e.subject ?? e.taskId,
          status: 'pending',
          blockedBy: [],
          source: 'task',
        }
        const blockedBy = [...base.blockedBy, ...(e.addBlockedBy ?? [])]
        const changed: TodoItem = {
          ...base,
          subject: e.subject ?? base.subject,
          status: isStatus(e.status) ? e.status : base.status,
          activeForm: e.activeForm ?? base.activeForm,
          blockedBy: [...new Set(blockedBy)],
        }
        const blocks = new Set(e.addBlocks ?? [])
        const rest = list
          .filter(one => one.id !== e.taskId)
          .map(one =>
            blocks.has(one.id) && !one.blockedBy.includes(e.taskId)
              ? { ...one, blockedBy: [...one.blockedBy, e.taskId] }
              : one,
          )
        return found ? [...rest, changed].sort(byOrder(list)) : [...rest, changed]
      })
    }

    return ran
  })

  on('tool.call', { tool: 'TaskList' }, async ($, e, next) => {
    const ran = await next(e)
    const tasks = asRecord(ran.result)?.tasks
    if (Array.isArray(tasks) && !ran.isError) {
      await record($, list => {
        const todos = list.filter(one => one.source === 'todo')
        const synced: TodoItem[] = []
        for (const raw of tasks) {
          const task = asRecord(raw)
          const id = typeof task?.id === 'string' ? task.id : undefined
          if (!id) continue
          const before = list.find(one => one.id === id)
          synced.push({
            id,
            subject: typeof task?.subject === 'string' ? task.subject : before?.subject ?? id,
            status: isStatus(task?.status) ? task.status : before?.status ?? 'pending',
            blockedBy: asStrings(task?.blockedBy),
            activeForm: before?.activeForm,
            source: 'task',
          })
        }
        return [...synced, ...todos]
      })
    }

    return ran
  })

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (!ran.isError && !ran.deny) {
      const written = asRecord(ran.result)?.newTodos
      const source: unknown[] = Array.isArray(written) ? written : e.todos
      const todos: TodoItem[] = []
      source.forEach((raw, index) => {
        const todo = asRecord(raw)
        if (typeof todo?.content !== 'string') return
        todos.push({
          id: `todo:${index}`,
          subject: todo.content,
          status: isStatus(todo.status) ? todo.status : 'pending',
          blockedBy: [],
          activeForm: typeof todo.activeForm === 'string' ? todo.activeForm : undefined,
          source: 'todo',
        })
      })
      await record($, list => [...list.filter(one => one.source === 'task'), ...todos])
    }

    return ran
  })

  // The band above the prompt: the open rows of the tree, indented as the
  // pane indents them. Nothing is drawn while a survey holds the band, when
  // hidden, or with no open row.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey || !(await read($, band))) return below
    const list = await read($, items)
    const open = layout(list).filter(({ item }) => item.status !== 'completed')
    if (open.length === 0) return below
    const { Box, Text } = $.ui.resolve(e)
    const done = list.filter(one => one.status === 'completed').length
    const active = list.filter(one => one.status === 'in_progress').length
    const columns = Math.max(12, e.props.bodyColumns)
    const shown = open.slice(0, BAND_ROWS)
    const more = open.length - shown.length

    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text bold>{`Todo Tree ${done}/${list.length}`}</Text>
          <Text dimColor>{active > 0 ? ` · ${active} running` : ''}</Text>
        </Box>
        {shown.map(({ item, depth }) => {
          const line = ` ${'  '.repeat(depth)}${glyph(item.status)} ${item.subject}${
            item.status === 'in_progress' && item.activeForm ? ` · ${item.activeForm}` : ''
          }`.slice(0, columns)
          return item.status === 'in_progress' ? (
            <Text color="warning" wrap="truncate-end">
              {line}
            </Text>
          ) : (
            <Text wrap="truncate-end">{line}</Text>
          )
        })}
        {more > 0 ? <Text dimColor>{` +${more} more`}</Text> : null}
        {below}
      </Box>
    )
  })

  // The docked pane, on /todo-tree pane: the whole tree, completed rows included.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, items)
    const rows = layout(list)
    const done = list.filter(one => one.status === 'completed').length
    const active = list.filter(one => one.status === 'in_progress').length
    const columns = Math.max(12, (e.props.bodyColumns ?? 40) - 2)

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>{`Todo Tree ${done}/${list.length}`}</Text>
          <Text dimColor>{active > 0 ? `${active} running` : ''}</Text>
        </Box>
        {list.length === 0 && (
          <Text dimColor wrap="wrap">
            No rows yet. The todo tool, and TaskCreate · TodoWrite calls, fill this tree.
          </Text>
        )}
        {rows.map(({ item, depth }) => {
          const indent = '  '.repeat(depth)
          const line = `${indent}${glyph(item.status)} ${item.subject}`.slice(0, columns)
          if (item.status === 'completed') {
            return (
              <Text dimColor strikethrough wrap="truncate-end">
                {line}
              </Text>
            )
          }
          if (item.status === 'in_progress') {
            return (
              <Box flexDirection="column">
                <Text color="warning" bold wrap="truncate-end">
                  {line}
                </Text>
                {item.activeForm ? (
                  <Text dimColor wrap="truncate-end">
                    {`${indent}    ${item.activeForm}`.slice(0, columns)}
                  </Text>
                ) : null}
              </Box>
            )
          }
          return <Text wrap="truncate-end">{line}</Text>
        })}
      </Box>
    )
  })
}
