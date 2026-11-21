// 過去のクエストをタップで選べるボタンの列（入力の手間を省く）
import type { Quest } from '../../types/quest'

type Props = {
  quests: Quest[]
  onPick: (title: string) => void
}

export function RecentQuestChips({ quests, onPick }: Props) {
  if (quests.length === 0) return null
  return (
    <div className="chips">
      <span className="muted small">最近のクエスト：</span>
      {quests.map((q) => (
        <button type="button" key={q.id} className="chip" onClick={() => onPick(q.title)}>
          {q.title}
        </button>
      ))}
    </div>
  )
}
