export type WaitingStatus = 'waiting' | 'replied' | 'done'

export type WaitingItem = {
  id: string
  /** The recipient as the SendMessage call spelled it. */
  peer: string
  /** The call's summary, or the first line of its message. */
  summary: string
  sentAt: number
  status: WaitingStatus
  /** When a reply arrived or the row was marked done. */
  settledAt?: number
  /** The first line of the reply. */
  preview?: string
}

declare module 'claude-code' {
  interface PluginState {
    'waiting-pane': {
      items: WaitingItem[]
      /** Whether the band above the prompt is shown. */
      band: boolean
    }
  }
}
