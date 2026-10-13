import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgendaItem, AgendaStatus } from '../types'

const PLUGIN = 'agenda-pane'
const PANE = 'agenda'
const TITLE = 'Agenda'
const TOOL = 'agenda'
// The name the model calls the tool by, as the engine lists a plugin's tool.
const TOOL_ID = `mcp__${PLUGIN}__${TOOL}`
// How many live rows the band above the prompt lists before "+n more".
const BAND_ROWS = 8

const items = atom({ plugin: 'agenda-pane', key: 'items' } as const, [])
const seq = atom({ plugin: 'agenda-pane', key: 'seq' } as const, 0)
const band = atom({ plugin: 'agenda-pane', key: 'band' } as const, true)

const STATUSES: readonly AgendaStatus[] = ['open', 'waiting_user', 'decided', 'parked']

const isStatus = (value: unknown): value is AgendaStatus =>
  typeof value === 'string' && (STATUSES as readonly string[]).includes(value)

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

const isLive = (one: AgendaItem) => one.status === 'open' || one.status === 'waiting_user'

const glyph = (status: AgendaStatus) =>
  status === 'open' ? '[ ]' : status === 'waiting_user' ? '[?]' : status === 'decided' ? '[x]' : '[-]'

const label = (status: AgendaStatus) =>
  status === 'open' ? 'open' : status === 'waiting_user' ? 'waiting on the user' : status === 'decided' ? 'decided' : 'parked'

// Live rows first (open, then waiting on the user) oldest first, then the
// parked ones, then the decided ones newest first.
const rank = (status: AgendaStatus) =>
  status === 'open' ? 0 : status === 'waiting_user' ? 1 : status === 'parked' ? 2 : 3

const ordered = (list: AgendaItem[]): AgendaItem[] =>
  [...list].sort((a, b) =>
    rank(a.status) !== rank(b.status)
      ? rank(a.status) - rank(b.status)
      : a.status === 'decided'
        ? b.updatedAt - a.updatedAt
        : a.openedAt - b.openedAt,
  )

// The agenda as the model reads it back: one line per row, pane order.
const listing = (list: AgendaItem[]) =>
  list.length === 0
    ? 'Agenda is empty.'
    : ordered(list)
        .map(one => `${one.id} [${one.status}] ${one.title}${one.note ? ` · ${one.note}` : ''}`)
        .join('\n')

const record = async ($: EngineInterface, fn: (list: AgendaItem[]) => AgendaItem[]) => {
  try {
    await update($, items, fn)
  } catch (err) {
    $.ui.log(`${PLUGIN}: state write failed: ${String(err)}`, { to: 'debug' })
  }
}

const nextId = async ($: EngineInterface) => {
  await update($, seq, n => n + 1)
  return `a${await read($, seq)}`
}

const add = async ($: EngineInterface, title: string, status: AgendaStatus, note?: string) => {
  const now = Date.now()
  const created: AgendaItem = { id: await nextId($), title, status, note, openedAt: now, updatedAt: now }
  await record($, list => [...list, created])
  return created
}

type Patch = { title?: string; status?: AgendaStatus; note?: string }

const patch = async ($: EngineInterface, id: string, change: Patch): Promise<AgendaItem | undefined> => {
  let changed: AgendaItem | undefined
  await record($, list =>
    list.map(one => {
      if (one.id !== id) return one
      changed = {
        ...one,
        title: change.title ?? one.title,
        status: change.status ?? one.status,
        note: change.note ?? one.note,
        updatedAt: Date.now(),
      }
      return changed
    }),
  )
  return changed
}

const remove = async ($: EngineInterface, id: string) => {
  let found = false
  await record($, list => {
    found = list.some(one => one.id === id)
    return list.filter(one => one.id !== id)
  })
  return found
}

// A row by its id, or by its number in the pane and the band.
const pick = (list: AgendaItem[], ref: string): AgendaItem | undefined => {
  const rows = ordered(list)
  const index = Number(ref)
  if (Number.isInteger(index) && index >= 1 && index <= rows.length) return rows[index - 1]
  return rows.find(one => one.id === ref.toLowerCase())
}

// Opens the docked pane as the person's own request (/agenda pane).
const show = async ($: EngineInterface) => {
  const mine = (await $.ui.panes()).find(pane => pane.id === PANE)
  if (mine && !mine.isPlaced) await $.ui.close({ id: PANE })
  return $.ui.open({ id: PANE, title: TITLE })
}

const SPEC = {
  name: TOOL,
  description:
    'Keeps the agenda of topics under discussion with the user, drawn above the prompt. ' +
    'Call it as the conversation moves: "add" when a topic opens (title, optional note); "update" to change a topic (id, then status, note or title); ' +
    '"resolve" when the user decides it (id, optional note holding the decision); "remove" to drop one (id); "list" to read the agenda. ' +
    'Statuses: open (being discussed now), waiting_user (a decision rests with the user), decided, parked (set aside for later). ' +
    'Ids are a1, a2, ... as add and list answer them. Keep titles to one short line.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['add', 'update', 'resolve', 'remove', 'list'] },
      id: { type: 'string', description: 'The topic id (a1, a2, ...) for update, resolve and remove' },
      title: { type: 'string', description: 'The topic, one short line' },
      status: { type: 'string', enum: ['open', 'waiting_user', 'decided', 'parked'] },
      note: { type: 'string', description: 'One line of context, or the decision' },
    },
    required: ['action'],
  },
}

const DEMO = (): AgendaItem[] => {
  const now = Date.now()
  return [
    { id: 'd1', title: 'Logger: nestjs-pino or keep JsonConsoleLogger', status: 'waiting_user', note: 'recommended nestjs-pino', openedAt: now - 30 * 60000, updatedAt: now - 5 * 60000 },
    { id: 'd2', title: 'Log shipping: Alloy file tail or OTLP direct', status: 'open', openedAt: now - 20 * 60000, updatedAt: now - 20 * 60000 },
    { id: 'd3', title: 'Built-in dashboard vs Grafana', status: 'decided', note: 'Grafana ecosystem, UI removed', openedAt: now - 180 * 60000, updatedAt: now - 60 * 60000 },
    { id: 'd4', title: 'Usage metrics pipeline', status: 'parked', note: 'second phase', openedAt: now - 240 * 60000, updatedAt: now - 200 * 60000 },
  ]
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register(SPEC)
    await $.command.register({
      name: 'agenda',
      description: 'Show the topics under discussion above the prompt',
      argumentHint:
        'hide | show | pane | add <title> | done|wait|open|park|remove <n|id> | note <n|id> <text> | clear | status | demo | close',
    })

    return next(e)
  })

  // The model keeps the agenda through this tool. The engine takes a plugin
  // tool's result as text, so every answer is a line, then the agenda; a
  // failure answers as an error line instead of failing the call.
  on('tool.call', { tool: new RegExp(`^${TOOL_ID}$`) }, async ($, e) => {
    const answer = async (head: string) => ({ result: `${head}\n${listing(await read($, items))}` })
    try {
      const raw: Record<string, unknown> = Object(e)
      const input = asRecord(raw.input) ?? raw
      const action = asText(input.action) ?? 'list'
      const id = asText(input.id)?.toLowerCase()
      const title = asText(input.title)
      const note = asText(input.note)
      const status = isStatus(input.status) ? input.status : undefined

      if (action === 'add') {
        if (!title) return { result: 'Error: add needs a title' }
        const created = await add($, title, status ?? 'open', note)
        return answer(`Added ${created.id} [${created.status}]: ${created.title}`)
      }
      if (action === 'update' || action === 'resolve') {
        if (!id) return { result: `Error: ${action} needs an id` }
        const changed = await patch($, id, { title, note, status: action === 'resolve' ? 'decided' : status })
        if (!changed) return { result: `Error: no topic ${id}` }
        return answer(`${changed.id} is now ${label(changed.status)}: ${changed.title}`)
      }
      if (action === 'remove') {
        if (!id) return { result: 'Error: remove needs an id' }
        const found = await remove($, id)
        return found ? answer(`Removed ${id}`) : { result: `Error: no topic ${id}` }
      }
      return { result: listing(await read($, items)) }
    } catch (err) {
      $.ui.log(`${PLUGIN}: tool call failed: ${String(err)}`, { to: 'debug' })
      return { result: `Error: ${String(err)}` }
    }
  })

  on('command.run', { command: 'agenda' }, async ($, e) => {
    const [verb = '', ...rest] = (e.args ?? '').trim().split(/\s+/)
    const target = rest.join(' ').trim()

    if (verb === 'hide') {
      await update($, band, () => false)
      return { text: 'Agenda band hidden. /agenda show brings it back.' }
    }
    if (verb === 'pane') {
      const opened = await show($)
      return {
        text: opened.isPlaced ? 'Agenda pane opened.' : `Agenda pane is waiting for room: ${opened.reason}`,
      }
    }
    if (verb === 'close') {
      await $.ui.close({ id: PANE })
      return { text: 'Agenda pane closed.' }
    }
    if (verb === 'add') {
      if (target === '') return { text: 'Usage: /agenda add <title>' }
      const created = await add($, target, 'open')
      await update($, band, () => true)
      return { text: `Added ${created.id}: ${created.title}` }
    }
    if (verb === 'done' || verb === 'wait' || verb === 'open' || verb === 'park' || verb === 'remove') {
      if (target === '') return { text: `Usage: /agenda ${verb} <row number or id>` }
      const chosen = pick(await read($, items), target)
      if (!chosen) return { text: `No agenda row "${target}".` }
      if (verb === 'remove') {
        await remove($, chosen.id)
        return { text: `Removed ${chosen.id}: ${chosen.title}` }
      }
      const status: AgendaStatus =
        verb === 'done' ? 'decided' : verb === 'wait' ? 'waiting_user' : verb === 'park' ? 'parked' : 'open'
      await patch($, chosen.id, { status })
      return { text: `${chosen.id} is now ${label(status)}: ${chosen.title}` }
    }
    if (verb === 'note') {
      const [ref = '', ...words] = target.split(/\s+/)
      const text = words.join(' ').trim()
      if (ref === '' || text === '') return { text: 'Usage: /agenda note <row number or id> <text>' }
      const chosen = pick(await read($, items), ref)
      if (!chosen) return { text: `No agenda row "${ref}".` }
      await patch($, chosen.id, { note: text })
      return { text: `Noted on ${chosen.id}.` }
    }
    if (verb === 'clear') {
      let kept = 0
      await record($, list => {
        const left = list.filter(isLive)
        kept = left.length
        return left
      })
      return { text: `Decided and parked rows removed; ${kept} left.` }
    }
    if (verb === 'demo') {
      await record($, () => DEMO())
      await update($, band, () => true)
      return { text: 'Agenda demo loaded above the prompt. Run /agenda clear to remove it.' }
    }
    if (verb === 'status') {
      const list = await read($, items)
      const live = list.filter(isLive).length
      const panes = await $.ui.panes()
      const where = e.presentation.isFullscreen ? 'fullscreen' : 'main screen'
      const lines = [
        `${PLUGIN}: ${live} live, ${list.length - live} settled; band ${(await read($, band)) ? 'shown' : 'hidden'}; tool ${TOOL_ID}`,
        `terminal: ${where}, ${e.presentation.columns} columns`,
        panes.length === 0
          ? 'panes: none open'
          : `panes: ${panes
              .map(pane => `${pane.id} (${pane.isPlaced ? 'placed' : 'waiting'}${pane.isShown ? ', shown' : ''})`)
              .join(', ')}`,
      ]
      return { text: lines.join('\n') }
    }

    // `/agenda` and `/agenda show`: the band above the prompt.
    await update($, band, () => true)
    const live = (await read($, items)).filter(isLive).length
    return { text: `Agenda band shown: ${live} under discussion.` }
  })

  // The band above the prompt: the live rows, numbered as the pane numbers
  // them. Nothing is drawn while a survey holds the band, when hidden, or
  // with no live row.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey || !(await read($, band))) return below
    const list = ordered(await read($, items))
    const live = list.filter(isLive)
    if (live.length === 0) return below
    const { Box, Text } = $.ui.resolve(e)
    const asking = live.filter(one => one.status === 'waiting_user').length
    const columns = Math.max(12, e.props.bodyColumns)
    const shown = live.slice(0, BAND_ROWS)
    const more = live.length - shown.length

    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text bold>{`Agenda ${live.length}`}</Text>
          <Text dimColor>{asking > 0 ? ` · ${asking} on the user` : ''}</Text>
        </Box>
        {shown.map((one, index) => {
          const line = ` ${index + 1}. ${glyph(one.status)} ${one.title}${one.note ? ` · ${one.note}` : ''}`.slice(0, columns)
          return one.status === 'waiting_user' ? (
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

  // The docked pane, on /agenda pane: every row, settled ones included.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = ordered(await read($, items))
    const live = list.filter(isLive).length
    const asking = list.filter(one => one.status === 'waiting_user').length
    const columns = Math.max(12, (e.props.bodyColumns ?? 40) - 2)

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>{`Agenda ${live}/${list.length}`}</Text>
          <Text dimColor>{asking > 0 ? `${asking} on the user` : ''}</Text>
        </Box>
        {list.length === 0 && (
          <Text dimColor wrap="wrap">
            Nothing under discussion. The model adds topics as they open; /agenda add does too.
          </Text>
        )}
        {list.map((one, index) => {
          const head = `${index + 1}. ${glyph(one.status)} ${one.title}`.slice(0, columns)
          const note = one.note ? `       ${one.note}`.slice(0, columns) : undefined
          if (one.status === 'decided' || one.status === 'parked') {
            return (
              <Box flexDirection="column">
                <Text dimColor strikethrough={one.status === 'decided'} wrap="truncate-end">
                  {head}
                </Text>
                {note ? (
                  <Text dimColor wrap="truncate-end">
                    {note}
                  </Text>
                ) : null}
              </Box>
            )
          }
          return (
            <Box flexDirection="column">
              <Text color={one.status === 'waiting_user' ? 'warning' : undefined} bold wrap="truncate-end">
                {head}
              </Text>
              {note ? (
                <Text dimColor wrap="truncate-end">
                  {note}
                </Text>
              ) : null}
            </Box>
          )
        })}
      </Box>
    )
  })
}
