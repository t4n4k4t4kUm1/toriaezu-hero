// 帰還結果の仮表示。ステップ5で「報酬受け取りモーダル」に置き換える。
import { FIRST_STRIKE_SEC } from '../../config/quest'
import { CHEST_LABEL, chestRankFromSec } from '../../config/rewards'
import { formatDuration } from '../../lib/time'
import type { SessionWithTitle } from '../../types/quest'

type Props = {
  session: SessionWithTitle
  onClose: () => void
}

export function ReturnResult({ session, onClose }: Props) {
  const sec = session.recorded_duration_sec ?? 0
  const fulfilled = session.reservation_id !== null && sec >= FIRST_STRIKE_SEC
  return (
    <div className="session-panel">
      <p>{session.is_auto_returned ? '焚き火の薪が燃え尽きた…（自動帰還）' : 'キャンプに帰還した'}</p>
      <p>
        「{session.title}」 記録 {formatDuration(sec)} ／ {CHEST_LABEL[chestRankFromSec(sec)]}
      </p>
      {fulfilled && <p>予約クエスト達成！</p>}
      <p className="muted small">（報酬の受け取りはステップ5で作る）</p>
      <button onClick={onClose}>OK</button>
    </div>
  )
}
