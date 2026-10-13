export type AgendaStatus = 'open' | 'waiting_user' | 'decided' | 'parked'

export type AgendaItem = {
  /** a1, a2, ... as the tool and the command answer it. */
  id: string
  title: string
  status: AgendaStatus
  /** One line of context, or the decision once decided. */
  note?: string
  openedAt: number
  updatedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'agenda-pane': {
      items: AgendaItem[]
      seq: number
      /** Whether the band above the prompt is shown. */
      band: boolean
    }
  }
}
