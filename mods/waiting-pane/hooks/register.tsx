import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { WaitingItem, WaitingStatus } from '../types'

const PLUGIN = 'waiting-pane'
const TOOL = 'waiting'
// The name the model calls the tool by, as the engine lists a plugin's tool.
const TOOL_ID = `mcp__${PLUGIN}__${TOOL}`
const PANE = 'waiting'
const TITLE = 'Waiting'
// How many settled rows (replied or done) stay under the waiting ones.
const KEEP_SETTLED = 12
// How many waiting rows the band above the prompt lists before "+n more".
const BAND_ROWS = 5

const items = atom({ plugin: 'waiting-pane', key: 'items' } as const, [])
const band = atom({ plugin: 'waiting-pane', key: 'band' } as const, true)

const pad = (n: number) => String(n).padStart(2, '0')

const clock = (ms: number) => {
  const at = new Date(ms)
  return `${pad(at.getHours())}:${pad(at.getMinutes())}`
}

const elapsed = (from: number, to: number) => {
  const minutes = Math.max(0, Math.round((to - from) / 60000))
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${pad(minutes % 60)}`
}

const firstLine = (text: string) =>
  text
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line !== '') ?? ''

// "lab-nest [2e7a80]" and "lab-nest" are the same peer; so are a bridge
// address and the name the engine prints beside it.
const peerKey = (name: string) =>
  name
    .replace(/\s*\[[0-9a-f]+\]\s*$/i, '')
    .trim()
    .toLowerCase()

const ENVELOPE = /<(cross-session-message|agent-message)\b([^>]*)>/

// Who sent an inbound delivery, read off the envelope the engine wraps it
// in: `from` (an address or agent id) and `from-name` (the session's name).
const senderOf = (text: string): string[] => {
  const head = text.match(ENVELOPE)
  if (!head) return []
  const attrs = head[2] ?? ''
  const from = attrs.match(/\bfrom="([^"]*)"/)?.[1]
  const name = attrs.match(/\bfrom-name="([^"]*)"/)?.[1]
  return [from, name].filter((one): one is string => typeof one === 'string' && one !== '')
}

// The reply's first line, without the envelope.
const previewOf = (text: string) => {
  const head = text.match(ENVELOPE)
  const inner = head ? text.slice((head.index ?? 0) + head[0].length) : text
  return firstLine(inner.replace(/<\/(?:cross-session-message|agent-message)>[\s\S]*$/, ''))
}

const glyph = (status: WaitingStatus) =>
  status === 'waiting' ? '[..]' : status === 'replied' ? '[ok]' : '[--]'

// Waiting rows oldest first, then the settled ones newest first.
const ordered = (list: WaitingItem[]): WaitingItem[] => {
  const waiting = list.filter(one => one.status === 'waiting').sort((a, b) => a.sentAt - b.sentAt)
  const settled = list
    .filter(one => one.status !== 'waiting')
    .sort((a, b) => (b.settledAt ?? b.sentAt) - (a.settledAt ?? a.sentAt))
  return [...waiting, ...settled]
}

const trimSettled = (list: WaitingItem[]): WaitingItem[] => {
  const rows = ordered(list)
  return [
    ...rows.filter(one => one.status === 'waiting'),
    ...rows.filter(one => one.status !== 'waiting').slice(0, KEEP_SETTLED),
  ]
}

// Writes the list; a failure is logged and never reaches the event the hook
// is relaying, so a broken drawing cannot break a send or a delivery.
const record = async ($: EngineInterface, fn: (list: WaitingItem[]) => WaitingItem[]) => {
  try {
    await update($, items, fn)
  } catch (err) {
    $.ui.log(`${PLUGIN}: state write failed: ${String(err)}`, { to: 'debug' })
  }
}

// Opens the docked pane as the person's own request (/waiting pane).
const show = async ($: EngineInterface) => {
  const mine = (await $.ui.panes()).find(pane => pane.id === PANE)
  if (mine && !mine.isPlaced) await $.ui.close({ id: PANE })
  return $.ui.open({ id: PANE, title: TITLE })
}

// The list as the model reads it: one line per row, band order.
const listing = (list: WaitingItem[], now: number) =>
  list.length === 0
    ? 'Nothing pending.'
    : ordered(list)
        .map((one, index) => {
          const when =
            one.status === 'waiting'
              ? `waiting ${elapsed(one.sentAt, now)}`
              : `${one.status} ${clock(one.settledAt ?? one.sentAt)}${one.preview ? ` · ${one.preview}` : ''}`
          return `${index + 1}. ${glyph(one.status)} ${one.peer} · ${one.summary} · ${when}`
        })
        .join('\n')

const SPEC = {
  name: TOOL,
  description:
    'Reads and settles the list of messages this session sent to other sessions and still waits on (drawn above the prompt). ' +
    '"list" answers every row; "add" records a message sent some other way (peer, summary); "done" marks a row answered without a reply (id = its row number or peer name); "clear" drops the settled rows. ' +
    'Rows are added by SendMessage calls and settled by the reply of that peer on their own; call this only to read or to tidy.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'add', 'done', 'clear'] },
      id: { type: 'string', description: 'For done: the row number as listed, or the peer name' },
      peer: { type: 'string', description: 'For add: the session or agent the message went to' },
      summary: { type: 'string', description: 'For add: what was asked, one short line' },
    },
    required: ['action'],
  },
}

const DEMO = (): WaitingItem[] => {
  const now = Date.now()
  return [
    { id: 'w1', peer: 'lab-clients-gitter', summary: 'UI removal: close Sub and Parent, delete branches', sentAt: now - 41 * 60000, status: 'waiting' },
    { id: 'w2', peer: 'lab-nest [2e7a80]', summary: 'Scenario 7 decision', sentAt: now - 9 * 60000, status: 'waiting' },
    { id: 'w3', peer: 'lab-clients', summary: 'Tree released, dev-v2.0 checked out', sentAt: now - 30 * 60000, status: 'replied', settledAt: now - 3 * 60000, preview: '[lab-clients → book-forward] tree matches, nothing to clean' },
    { id: 'w4', peer: 'book-forward-gitter', summary: 'Issue body line', sentAt: now - 120 * 60000, status: 'done', settledAt: now - 60 * 60000 },
  ]
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register(SPEC)
    await $.command.register({
      name: 'waiting',
      description: 'Show what this session is waiting on from other sessions, above the prompt',
      argumentHint: 'hide | show | pane | done <n|peer> | clear | status | demo | close',
    })

    return next(e)
  })

  on('command.run', { command: 'waiting' }, async ($, e) => {
    const [verb = '', ...rest] = (e.args ?? '').trim().split(/\s+/)
    const target = rest.join(' ').trim()

    if (verb === 'hide') {
      await update($, band, () => false)
      return { text: 'Waiting band hidden. /waiting show brings it back.' }
    }
    if (verb === 'pane') {
      const opened = await show($)
      return {
        text: opened.isPlaced ? 'Waiting pane opened.' : `Waiting pane is waiting for room: ${opened.reason}`,
      }
    }
    if (verb === 'close') {
      await $.ui.close({ id: PANE })
      return { text: 'Waiting pane closed.' }
    }
    if (verb === 'clear') {
      let kept = 0
      await record($, list => {
        const left = list.filter(one => one.status === 'waiting')
        kept = left.length
        return left
      })
      return { text: `Settled rows removed; ${kept} still waiting.` }
    }
    if (verb === 'demo') {
      await record($, () => DEMO())
      await update($, band, () => true)
      return { text: 'Waiting demo loaded above the prompt. Run /waiting clear to remove it.' }
    }
    if (verb === 'status') {
      const list = await read($, items)
      const waiting = list.filter(one => one.status === 'waiting').length
      const panes = await $.ui.panes()
      const where = e.presentation.isFullscreen ? 'fullscreen' : 'main screen'
      const lines = [
        `${PLUGIN}: ${waiting} waiting, ${list.length - waiting} settled; band ${(await read($, band)) ? 'shown' : 'hidden'}`,
        `terminal: ${where}, ${e.presentation.columns} columns`,
        panes.length === 0
          ? 'panes: none open'
          : `panes: ${panes
              .map(pane => `${pane.id} (${pane.isPlaced ? 'placed' : 'waiting'}${pane.isShown ? ', shown' : ''})`)
              .join(', ')}`,
      ]
      return { text: lines.join('\n') }
    }
    if (verb === 'done') {
      if (target === '') return { text: 'Usage: /waiting done <row number or peer name>' }
      const now = Date.now()
      let count = 0
      await record($, list => {
        const rows = ordered(list)
        const index = Number(target)
        const byIndex = Number.isInteger(index) && index >= 1 && index <= rows.length ? rows[index - 1] : undefined
        const chosen = byIndex
          ? [byIndex]
          : rows.filter(one => one.status === 'waiting' && peerKey(one.peer) === peerKey(target))
        const ids = new Set(chosen.filter(one => one.status === 'waiting').map(one => one.id))
        count = ids.size
        return list.map(one => (ids.has(one.id) ? { ...one, status: 'done' as const, settledAt: now } : one))
      })
      return { text: count === 0 ? `Nothing waiting matches "${target}".` : `Marked ${count} row(s) done.` }
    }

    // `/waiting` and `/waiting show`: the band above the prompt.
    await update($, band, () => true)
    const waiting = (await read($, items)).filter(one => one.status === 'waiting').length
    return { text: `Waiting band shown: ${waiting} waiting.` }
  })

  // The model reads or tidies the list through this tool; the result is text.
  on('tool.call', { tool: new RegExp(`^${TOOL_ID}$`) }, async ($, e) => {
    try {
      const raw: Record<string, unknown> = Object(e)
      const input = typeof raw.input === 'object' && raw.input !== null ? (raw.input as Record<string, unknown>) : raw
      const action = typeof input.action === 'string' ? input.action : 'list'
      const target = typeof input.id === 'string' ? input.id.trim() : ''
      if (action === 'add') {
        const peer = typeof input.peer === 'string' ? input.peer.trim() : ''
        const summary = typeof input.summary === 'string' ? input.summary.trim() : ''
        if (peer === '' || summary === '') return { result: 'Error: add needs peer and summary' }
        const now = Date.now()
        const created: WaitingItem = { id: `manual:${now}`, peer, summary: summary.slice(0, 160), sentAt: now, status: 'waiting' }
        await record($, list => trimSettled([...list, created]))
        return { result: `Added.` + String.fromCharCode(10) + listing(await read($, items), now) }
      }
      if (action === 'done') {
        if (target === '') return { result: 'Error: done needs the row number or the peer name' }
        const now = Date.now()
        let count = 0
        await record($, list => {
          const rows = ordered(list)
          const index = Number(target)
          const byIndex = Number.isInteger(index) && index >= 1 && index <= rows.length ? rows[index - 1] : undefined
          const chosen = byIndex
            ? [byIndex]
            : rows.filter(one => one.status === 'waiting' && peerKey(one.peer) === peerKey(target))
          const ids = new Set(chosen.filter(one => one.status === 'waiting').map(one => one.id))
          count = ids.size
          return list.map(one => (ids.has(one.id) ? { ...one, status: 'done' as const, settledAt: now } : one))
        })
        return { result: `Marked ${count} row(s) done.\n${listing(await read($, items), now)}` }
      }
      if (action === 'clear') {
        await record($, list => list.filter(one => one.status === 'waiting'))
        return { result: `Settled rows removed.\n${listing(await read($, items), Date.now())}` }
      }
      return { result: listing(await read($, items), Date.now()) }
    } catch (err) {
      $.ui.log(`${PLUGIN}: tool call failed: ${String(err)}`, { to: 'debug' })
      return { result: `Error: ${String(err)}` }
    }
  })

  // Every message the model sends to another session or agent becomes a row.
  // The send itself is relayed first; a failure here is logged, never raised.
  on('tool.call', { tool: 'SendMessage' }, async ($, e, next) => {
    const ran = await next(e)
    try {
      const to = String(e.to ?? '').trim()
      if (ran.deny || ran.isError || typeof e.message !== 'string' || to === '' || to === 'main') return ran
      const summary = (e.summary ?? '').trim() || firstLine(e.message)
      const created: WaitingItem = {
        id: e.tool_use_id,
        peer: to,
        summary: summary.slice(0, 160),
        sentAt: Date.now(),
        status: 'waiting',
      }
      await record($, list => trimSettled([...list.filter(one => one.id !== created.id), created]))
      $.ui.toast(`Waiting: ${created.peer} · ${created.summary}`)
    } catch (err) {
      $.ui.log(`${PLUGIN}: send not recorded: ${String(err)}`, { to: 'debug' })
    }

    return ran
  })

  // A delivery from a peer settles every row waiting on that peer.
  on('session.receive', async ($, e, next) => {
    const ran = await next(e)
    try {
      if (ran.consumed !== undefined) return ran
      const keys = new Set(senderOf(e.text).map(peerKey))
      if (keys.size === 0) {
        $.ui.log(
          `${PLUGIN}: delivery without a sender envelope (${e.origin.kind}): ${firstLine(e.text).slice(0, 80)}`,
          { to: 'debug' },
        )
        return ran
      }
      const now = Date.now()
      const preview = previewOf(e.text).slice(0, 160)
      let settled = 0
      await record($, list =>
        trimSettled(
          list.map(one => {
            if (one.status !== 'waiting' || !keys.has(peerKey(one.peer))) return one
            settled += 1
            return { ...one, status: 'replied' as const, settledAt: now, preview }
          }),
        ),
      )
      if (settled > 0) $.ui.toast(`Reply: ${senderOf(e.text)[1] ?? senderOf(e.text)[0] ?? 'peer'} · ${preview.slice(0, 60)}`)
    } catch (err) {
      $.ui.log(`${PLUGIN}: delivery not matched: ${String(err)}`, { to: 'debug' })
    }

    return ran
  })

  // The elapsed times are drawn from the clock, so a turn's end redraws them.
  on('turn.complete', async ($, e, next) => {
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // The band above the prompt is one site shared by every mod: the hook takes
  // the tree the plugins beneath drew and puts its own rows above it. Nothing
  // of its own while a survey holds the band, when hidden, or with no rows.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey || !(await read($, band))) return below
    const list = ordered(await read($, items))
    if (list.length === 0) return below
    const { Box, Text } = $.ui.resolve(e)
    const waiting = list.filter(one => one.status === 'waiting')
    const latest = list.find(one => one.status === 'replied')
    const columns = Math.max(12, e.props.bodyColumns)
    const now = Date.now()
    const shown = waiting.slice(0, BAND_ROWS)
    const more = waiting.length - shown.length
    const oldest = waiting[0]

    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text bold>{`Waiting ${waiting.length}`}</Text>
          <Text dimColor>{oldest ? ` · oldest ${elapsed(oldest.sentAt, now)}` : ' · nothing pending'}</Text>
        </Box>
        {shown.map(one => (
          <Text color="warning" wrap="truncate-end">
            {` [..] ${one.peer} · ${one.summary} (${elapsed(one.sentAt, now)})`.slice(0, columns)}
          </Text>
        ))}
        {more > 0 ? <Text dimColor>{` +${more} more`}</Text> : null}
        {latest ? (
          <Text dimColor wrap="truncate-end">
            {` [ok] ${latest.peer} · ${clock(latest.settledAt ?? latest.sentAt)}${
              latest.preview ? ` · ${latest.preview}` : ''
            }`.slice(0, columns)}
          </Text>
        ) : null}
        {below}
      </Box>
    )
  })

  // The docked pane, on /waiting pane: every row with its times.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = ordered(await read($, items))
    const waiting = list.filter(one => one.status === 'waiting')
    const columns = Math.max(12, (e.props.bodyColumns ?? 40) - 2)
    const now = Date.now()
    const oldest = waiting[0]

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>{`Waiting ${waiting.length}/${list.length}`}</Text>
          <Text dimColor>{oldest ? `oldest ${elapsed(oldest.sentAt, now)}` : ''}</Text>
        </Box>
        {list.length === 0 && (
          <Text dimColor wrap="wrap">
            Nothing pending. A SendMessage to another session is listed here until that session replies.
          </Text>
        )}
        {list.map((one, index) => {
          const head = `${index + 1}. ${glyph(one.status)} ${one.peer} · ${one.summary}`.slice(0, columns)
          if (one.status === 'waiting') {
            return (
              <Box flexDirection="column">
                <Text color="warning" bold wrap="truncate-end">
                  {head}
                </Text>
                <Text dimColor wrap="truncate-end">
                  {`     sent ${clock(one.sentAt)} · waiting ${elapsed(one.sentAt, now)}`.slice(0, columns)}
                </Text>
              </Box>
            )
          }
          const when = one.settledAt ?? one.sentAt
          const tail = `     ${one.status === 'replied' ? 'replied' : 'done'} ${clock(when)}${
            one.preview ? ` · ${one.preview}` : ''
          }`.slice(0, columns)
          return (
            <Box flexDirection="column">
              <Text dimColor wrap="truncate-end">
                {head}
              </Text>
              <Text dimColor wrap="truncate-end">
                {tail}
              </Text>
            </Box>
          )
        })}
      </Box>
    )
  })
}
