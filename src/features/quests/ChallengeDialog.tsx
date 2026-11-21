// 「クエストに挑戦」：クエスト名を入れて「挑戦！」
import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import type { Quest } from '../../types/quest'
import { RecentQuestChips } from './RecentQuestChips'

type Props = {
  recentQuests: Quest[]
  /** 最初から入れておくクエスト名（ピン留めから開いたとき） */
  initialTitle?: string
  onSubmit: (title: string) => Promise<void>
  onClose: () => void
}

export function ChallengeDialog({ recentQuests, initialTitle = '', onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [sending, setSending] = useState(false)
  const trimmed = title.trim()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || sending) return
    setSending(true)
    await onSubmit(trimmed)
    setSending(false)
  }

  return (
    <Modal title="クエストに挑戦" onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        <label htmlFor="challenge-title">何に挑戦する？</label>
        <input
          id="challenge-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={50}
          placeholder="例：レポートのファイルを開く"
          autoComplete="off"
          autoFocus
        />
        <RecentQuestChips quests={recentQuests} onPick={setTitle} />
        <button type="submit" className="primary big" disabled={!trimmed || sending}>
          挑戦！
        </button>
      </form>
    </Modal>
  )
}
