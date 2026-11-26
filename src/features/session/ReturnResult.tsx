// 報酬受け取りモーダル（帰還したあとに出る）
//   1. 自動帰還のときだけ：実際の作業時間を自己申告
//   2. 1行冒険日誌（必須）を書くと「宝箱を開ける！」が押せる
//   3. 宝箱を開けると、XP が表示される（のちに宝箱からアイテムが出るようにする予定）
import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { levelFromXp } from '../../config/level'
import { FIRST_STRIKE_SEC } from '../../config/quest'
import { CHEST_LABEL, DECLARE_OPTIONS, chestRankFromSec } from '../../config/rewards'
import { formatDuration } from '../../lib/time'
import type { ClaimResult, SessionWithTitle } from '../../types/quest'

type Props = {
  session: SessionWithTitle
  /** 受け取る前の XP（レベルアップしたかを判定するため） */
  xpBefore: number
  onClaim: (memo: string | null, declaredSec: number | null) => Promise<ClaimResult | null>
  /** 結果を見終わったとき */
  onDone: (result: ClaimResult | null) => void
}

export function ReturnResult({ session, xpBefore, onClaim, onDone }: Props) {
  const recorded = session.recorded_duration_sec ?? 0
  const struck = recorded >= FIRST_STRIKE_SEC
  const fulfilledReservation = session.reservation_id !== null && struck

  const [declaredSec, setDeclaredSec] = useState<number | null>(null) // null ＝ 記録どおり
  const [memo, setMemo] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<ClaimResult | null>(null)

  const effectiveSec = declaredSec ?? recorded
  const memoOk = memo.trim().length >= 1 && memo.trim().length <= 50

  async function handleOpen(e: FormEvent) {
    e.preventDefault()
    if (!memoOk || sending) return
    setSending(true)
    const r = await onClaim(memo.trim(), session.is_auto_returned ? declaredSec : null)
    setSending(false)
    if (r) setResult(r)
  }

  // ----- 1分未満で帰還したとき -----
  if (!struck) {
    return (
      <Modal title="キャンプに帰還した">
        <div className="reward">
          <p>「{session.title}」 {formatDuration(recorded)}</p>
          <p>先制攻撃の前に帰還した。今回は宝箱なし。</p>
          <p className="muted small">次は1分だけ粘ってみよう。記録はちゃんと残っているよ。</p>
          <button
            className="primary big full"
            disabled={sending}
            onClick={async () => {
              setSending(true)
              const r = await onClaim(null, null)
              onDone(r)
            }}
          >
            OK
          </button>
        </div>
      </Modal>
    )
  }

  // ----- 宝箱を開けたあと（結果） -----
  if (result) {
    const leveledUp = levelFromXp(result.xp) > levelFromXp(xpBefore)
    return (
      <Modal title="宝箱を開けた！">
        <div className="reward">
          <p className="chest-name">{CHEST_LABEL[result.chest]}</p>
          <p className="reward-numbers">XP +{result.earned_xp}</p>
          {result.honest && <p className="muted small">正直に教えてくれてありがとう。その誠実さこそ勇者の証だ。</p>}
          {leveledUp && <p className="level-up">レベルアップ！ Lv.{levelFromXp(result.xp)}</p>}
          {fulfilledReservation && <p>予約クエスト達成！</p>}
          <button className="primary big full" onClick={() => onDone(result)}>
            キャンプに戻る
          </button>
        </div>
      </Modal>
    )
  }

  // ----- 宝箱を開ける前（日誌の入力） -----
  return (
    <Modal title={session.is_auto_returned ? '焚き火の薪が燃え尽きた' : 'キャンプに帰還した'}>
      <form className="reward dialog-form" onSubmit={handleOpen}>
        {session.is_auto_returned ? (
          <>
            <p>
              薪が燃え尽きるまで（2時間）集中していたようだ！
              <br />「{session.title}」の実際の作業時間はどれくらいだった？
            </p>
            <div className="choice-row">
              {DECLARE_OPTIONS.map((o) => (
                <button
                  type="button"
                  key={o.label}
                  className={declaredSec === o.sec ? 'chip selected' : 'chip'}
                  onClick={() => setDeclaredSec(o.sec)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="muted small">寝落ちや止め忘れでも大丈夫。正直に教えてね。</p>
          </>
        ) : (
          <p>
            「{session.title}」 {formatDuration(recorded)}
          </p>
        )}

        <p className="chest-name">{CHEST_LABEL[chestRankFromSec(effectiveSec)]}をゲット！</p>

        <label htmlFor="memo">1行冒険日誌：いま何を触った？</label>
        <input
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={50}
          placeholder="例：テキストを開いた、1行書いた"
          autoComplete="off"
        />

        <button type="submit" className="primary big" disabled={!memoOk || sending}>
          宝箱を開ける！
        </button>
      </form>
    </Modal>
  )
}
