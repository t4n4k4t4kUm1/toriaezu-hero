// 時間の小道具
import { useEffect, useState } from 'react'

/** 秒数を「12:34」や「1:02:03」の形にする */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}

/**
 * 今の時刻を返し、一定間隔で更新するフック。
 * タイマーは「数える」のではなく、この時刻と開始時刻の差で経過時間を出す。
 * スマホで画面を伏せて更新が止まっても、戻った瞬間に正しい値になる。
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, intervalMs)
    // 画面に戻ってきた瞬間にもすぐ更新する
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])
  return now
}
