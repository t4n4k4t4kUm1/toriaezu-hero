// ホームの「クエストに挑戦」「クエストを予約」ボタン＋今日の予約＋ピン留め
import { formatTime } from '../../lib/date'
import type { Quest, ReservationWithTitle } from '../../types/quest'

type Props = {
  busy: boolean // 挑戦中は新しく挑戦できない
  todayReservations: ReservationWithTitle[]
  pinnedQuests: Quest[]
  /** 挑戦ダイアログを開く（title を渡すと、その名前を入れた状態で開く） */
  onOpenChallenge: (title?: string) => void
  onOpenReserve: () => void
  onStart: (title: string) => void
}

export function QuestActions({
  busy,
  todayReservations,
  pinnedQuests,
  onOpenChallenge,
  onOpenReserve,
  onStart,
}: Props) {
  return (
    <section className="quest-actions">
      <div className="main-buttons">
        <button className="primary big" disabled={busy} onClick={() => onOpenChallenge()}>
          クエストに挑戦
        </button>
        <button className="big" onClick={onOpenReserve}>
          クエストを予約
        </button>
      </div>

      <h2>今日の予約クエスト</h2>
      {todayReservations.length === 0 ? (
        <p className="muted">今日の予約はありません。</p>
      ) : (
        <ul className="card-list">
          {todayReservations.map((r) => (
            <li key={r.id} className={r.fulfilled_at ? 'card done' : 'card'}>
              <div>
                <span className="card-title">{r.title}</span>
                {r.scheduled_time && <span className="muted small">{formatTime(r.scheduled_time)}</span>}
                {r.trigger_text && <span className="muted small">{r.trigger_text}</span>}
              </div>
              {r.fulfilled_at ? (
                <span className="badge done">達成</span>
              ) : (
                <button className="primary" disabled={busy} onClick={() => onStart(r.title)}>
                  挑戦！
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {pinnedQuests.length > 0 && (
        <>
          <h2>ピン留めクエスト</h2>
          <p className="muted small">タップすると挑戦の確認が出ます</p>
          <div className="chips">
            {pinnedQuests.map((q) => (
              <button key={q.id} className="chip" disabled={busy} onClick={() => onOpenChallenge(q.title)}>
                {q.title}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
