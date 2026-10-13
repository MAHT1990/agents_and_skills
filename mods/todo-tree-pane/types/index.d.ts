export type TodoStatus = 'pending' | 'in_progress' | 'completed'

export type TodoItem = {
  id: string
  subject: string
  status: TodoStatus
  blockedBy: string[]
  activeForm?: string
  source: 'task' | 'todo'
}

declare module 'claude-code' {
  interface PluginState {
    'todo-tree-pane': {
      items: TodoItem[]
      /** Whether the band above the prompt is shown. */
      band: boolean
      /** The last id the todo tool handed out. */
      seq: number
    }
  }
}
