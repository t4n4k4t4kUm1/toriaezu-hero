// クエスト挑戦中の表示（タイマーと帰還ボタン）
import { FIRST_STRIKE_SEC } from '../../config/quest'
import { CHEST_LABEL, chestRankFromSec } from '../../config/rewards'
import { formatDuration } from '../../lib/time'
import type { SessionWithTitle } from '../../types/quest'

type Props = {
  session: SessionWithTitle
  elapsedSec: number
  onReturn: () => void
}

export function QuestSessionPanel({ session, elapsedSec, onReturn }: Props) {
  const struck = elapsedSec >= FIRST_STRIKE_SEC
  const chest = chestRankFromSec(elapsedSec)

  return (
    <div className="session-panel">
      <p className="muted">クエスト挑戦中：{session.title}</p>
      <p className="timer">{formatDuration(elapsedSec)}</p>

      {/* 1分到達時も音やポップアップは出さず、表示が静かに変わるだけ */}
      {struck ? (
        <p>先制攻撃成功！ 追撃コンボ中 — {CHEST_LABEL[chest]}</p>
      ) : (
        <p className="muted">先制攻撃まであと {FIRST_STRIKE_SEC - elapsedSec} 秒</p>
      )}

      <button className="primary big full" onClick={onReturn}>
        キャンプに帰還する
      </button>
    </div>
  )
}
