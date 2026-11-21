// 初めて来た人に名前を入力してもらう画面
import { useState, type FormEvent } from 'react'

type Props = {
  onSubmit: (name: string) => Promise<void>
}

export function NameForm({ onSubmit }: Props) {
  const [name, setName] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = name.trim()
  const canSubmit = trimmed.length >= 1 && trimmed.length <= 20 && !sending

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSending(true)
    setError(null)
    try {
      await onSubmit(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSending(false)
    }
  }

  return (
    <form className="name-form" onSubmit={handleSubmit}>
      <label htmlFor="hero-name">勇者の名前を決めよう</label>
      <input
        id="hero-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        placeholder="1〜20文字"
        autoComplete="off"
      />
      <button type="submit" disabled={!canSubmit}>
        {sending ? '準備中…' : '冒険をはじめる'}
      </button>
      {error && <p className="error">エラー：{error}</p>}
    </form>
  )
}
