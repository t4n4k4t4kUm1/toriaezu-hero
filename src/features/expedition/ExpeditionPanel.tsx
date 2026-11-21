// 遠征中の表示（焚き火エリアの中に出す）
import { FIRST_STRIKE_SEC } from '../../config/expedition'
import { CHEST_LABEL, chestRankFromSec } from '../../config/rewards'
import { formatDuration } from '../../lib/time'
import type { SessionWithTask } from '../../types/workSession'

type Props = {
  session: SessionWithTask
  elapsedSec: number
  onReturn: () => void
}

export function ExpeditionPanel({ session, elapsedSec, onReturn }: Props) {
  const struck = elapsedSec >= FIRST_STRIKE_SEC
  const chest = chestRankFromSec(elapsedSec)

  return (
    <div className="expedition">
      <p className="muted">遠征中：{session.taskTitle}</p>
      <p className="timer" aria-live="off">
        {formatDuration(elapsedSec)}
      </p>

      {/* 1分到達時も音やポップアップは出さず、表示が静かに変わるだけ */}
      {struck ? (
        <p>先制攻撃成功！ 追撃コンボ中 — {CHEST_LABEL[chest]}</p>
      ) : (
        <p className="muted">先制攻撃まであと {FIRST_STRIKE_SEC - elapsedSec} 秒</p>
      )}

      <button className="primary return-button" onClick={onReturn}>
        キャンプに帰還する
      </button>
    </div>
  )
}
