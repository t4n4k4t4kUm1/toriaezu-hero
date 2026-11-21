// 「クエストを予約」：クエスト名・日付・（時刻 or 合図）を決める
import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { todayLocal } from '../../lib/date'
import type { Quest, ReserveInput } from '../../types/quest'
import { RecentQuestChips } from './RecentQuestChips'

type Timing = 'none' | 'time' | 'trigger'

type Props = {
  recentQuests: Quest[]
  initialTitle?: string
  onSubmit: (input: ReserveInput) => Promise<void>
  onClose: () => void
}

export function ReserveDialog({ recentQuests, initialTitle = '', onSubmit, onClose }: Props) {
  const today = todayLocal()
  const [title, setTitle] = useState(initialTitle)
  const [date, setDate] = useState(today)
  const [timing, setTiming] = useState<Timing>('none')
  const [time, setTime] = useState('21:00')
  const [trigger, setTrigger] = useState('')
  const [sending, setSending] = useState(false)

  const trimmed = title.trim()
  const canSubmit =
    trimmed.length > 0 &&
    date >= today &&
    !(timing === 'trigger' && trigger.trim() === '') &&
    !sending

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSending(true)
    await onSubmit({
      title: trimmed,
      date,
      time: timing === 'time' ? time : null,
      trigger: timing === 'trigger' ? trigger.trim() : null,
    })
    setSending(false)
  }

  return (
    <Modal title="クエストを予約" onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        <label htmlFor="reserve-title">何をする？</label>
        <input
          id="reserve-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={50}
          placeholder="例：英単語アプリを開く"
          autoComplete="off"
        />
        <RecentQuestChips quests={recentQuests} onPick={setTitle} />

        <label htmlFor="reserve-date">いつやる？</label>
        <input
          id="reserve-date"
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
        />

        <fieldset className="timing">
          <legend>きっかけ（任意）</legend>
          <label>
            <input type="radio" checked={timing === 'none'} onChange={() => setTiming('none')} />
            決めない
          </label>
          <label>
            <input type="radio" checked={timing === 'time'} onChange={() => setTiming('time')} />
            時刻
          </label>
          <label>
            <input
              type="radio"
              checked={timing === 'trigger'}
              onChange={() => setTiming('trigger')}
            />
            合図
          </label>
        </fieldset>

        {timing === 'time' && (
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="時刻" />
        )}
        {timing === 'trigger' && (
          <input
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            maxLength={30}
            placeholder="例：お風呂から上がったら"
            aria-label="合図"
          />
        )}

        <button type="submit" className="primary big" disabled={!canSubmit}>
          予約する
        </button>
      </form>
    </Modal>
  )
}
