// 焚き火エリア：焚き火と、その周りにいる人たち
// （MVPでは文字とカードだけ。本番ではアバターを焚き火の周りに並べる）
import { formatAgo, formatDuration, useNow } from '../../lib/time'
import type { Camper } from './useCampfire'

type Props = {
  campers: Camper[]
  connected: boolean
}

export function Campfire({ campers, connected }: Props) {
  const now = useNow()

  return (
    <div className="campfire">
      <div className="fire" aria-hidden="true">
        🔥
      </div>
      {!connected && <p className="muted small">焚き火に接続中…</p>}

      <ul className="campers">
        {campers.map((c) => (
          <li key={c.id} className={`camper ${c.status}${c.isMe ? ' me' : ''}`}>
            <span className="camper-name">
              {c.name}
              {c.isMe && '（あなた）'}
            </span>
            <span className="camper-status small">
              {c.status === 'questing' &&
                `${c.questTitle ?? 'クエスト'}に挑戦中（${formatDuration(
                  c.questStartedAt ? (now - Date.parse(c.questStartedAt)) / 1000 : 0,
                )}）`}
              {c.status === 'online' && 'オンライン'}
              {c.status === 'offline' &&
                `オフライン・${c.lastActiveAt ? formatAgo(now - Date.parse(c.lastActiveAt)) : ''}`}
            </span>
          </li>
        ))}
      </ul>
      {campers.length === 1 && connected && (
        <p className="muted small">まだ誰もいないみたい。焚き火を囲んで待っていよう。</p>
      )}
    </div>
  )
}
