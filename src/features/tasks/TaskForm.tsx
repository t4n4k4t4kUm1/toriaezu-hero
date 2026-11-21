// タスクの新規追加フォーム（入力して Enter か「追加」ですぐ登録）
import { useState, type FormEvent } from 'react'

type Props = {
  onAdd: (title: string) => Promise<void>
}

export function TaskForm({ onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [sending, setSending] = useState(false)
  const trimmed = title.trim()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || sending) return
    setSending(true)
    await onAdd(trimmed)
    setTitle('')
    setSending(false)
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={50}
        placeholder="新しいモンスター（例：レポートを開く）"
        aria-label="タスク名"
      />
      <button type="submit" disabled={!trimmed || sending}>
        追加
      </button>
    </form>
  )
}
