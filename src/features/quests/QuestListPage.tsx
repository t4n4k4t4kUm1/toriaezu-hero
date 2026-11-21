// メニューから開く「クエスト一覧」ページ
import { formatDateJa, formatTime } from '../../lib/date'
import { formatDuration } from '../../lib/time'
import type { Quest, ReservationWithTitle } from '../../types/quest'

type Props = {
  quests: Quest[]
  upcomingReservations: ReservationWithTitle[]
  missedReservations: ReservationWithTitle[]
  busy: boolean
  onStart: (title: string) => void
  onReserve: (title: string) => void
  onTogglePin: (quest: Quest) => void
  onCancelReservation: (id: string) => void
}

function ReservationNote({ r }: { r: ReservationWithTitle }) {
  return (
    <span className="muted small">
      {formatDateJa(r.scheduled_date)}
      {r.scheduled_time && ` ${formatTime(r.scheduled_time)}`}
      {r.trigger_text && ` ${r.trigger_text}`}
    </span>
  )
}

export function QuestListPage(props: Props) {
  const { quests, upcomingReservations, missedReservations, busy } = props
  // ピン留めを先頭に
  const sorted = [...quests].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))

  return (
    <section className="quest-list-page">
      {upcomingReservations.length > 0 && (
        <>
          <h2>予約中（明日以降）</h2>
          <ul className="card-list">
            {upcomingReservations.map((r) => (
              <li key={r.id} className="card">
                <div>
                  <span className="card-title">{r.title}</span>
                  <ReservationNote r={r} />
                </div>
                <button onClick={() => props.onCancelReservation(r.id)}>取り消す</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {missedReservations.length > 0 && (
        <>
          <h2>見送ったクエスト</h2>
          <ul className="card-list">
            {missedReservations.map((r) => (
              <li key={r.id} className="card muted-card">
                <div>
                  <span className="card-title">{r.title}</span>
                  <ReservationNote r={r} />
                </div>
                <button onClick={() => props.onReserve(r.title)}>予約し直す</button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>すべてのクエスト</h2>
      {sorted.length === 0 ? (
        <p className="muted">まだクエストがありません。ホームから挑戦か予約をしてみよう。</p>
      ) : (
        <ul className="card-list">
          {sorted.map((q) => (
            <li key={q.id} className="card column">
              <div>
                <span className="card-title">
                  {q.is_pinned && '📌 '}
                  {q.title}
                </span>
                <span className="muted small">
                  挑戦 {q.attempt_count}回
                  {q.total_duration_sec > 0 && ` ／ 合計 ${formatDuration(q.total_duration_sec)}`}
                </span>
              </div>
              <div className="card-actions">
                <button className="primary" disabled={busy} onClick={() => props.onStart(q.title)}>
                  挑戦
                </button>
                <button onClick={() => props.onReserve(q.title)}>予約</button>
                <button onClick={() => props.onTogglePin(q)}>
                  {q.is_pinned ? 'ピンを外す' : 'ピン留め'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
