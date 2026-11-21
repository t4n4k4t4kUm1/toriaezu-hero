// 帰還した結果の仮表示。ステップ5で「報酬受け取りモーダル」に置き換える。
import { CHEST_LABEL, chestRankFromSec } from '../../config/rewards'
import { formatDuration } from '../../lib/time'
import type { SessionWithTask } from '../../types/workSession'

type Props = {
  session: SessionWithTask
  onClose: () => void
}

export function ReturnResult({ session, onClose }: Props) {
  const sec = session.recorded_duration_sec ?? 0
  return (
    <div className="return-result">
      <p>
        {session.is_auto_returned ? '焚き火の薪が燃え尽きた…（自動帰還）' : 'キャンプに帰還した'}
      </p>
      <p>
        「{session.taskTitle}」 記録 {formatDuration(sec)} ／ {CHEST_LABEL[chestRankFromSec(sec)]}
      </p>
      <p className="muted">（報酬の受け取りはステップ5で作る）</p>
      <button onClick={onClose}>OK</button>
    </div>
  )
}
