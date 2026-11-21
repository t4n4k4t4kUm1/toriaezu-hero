// クエスト挑戦中（タイマー）の状態を管理する「フック」
import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_SESSION_SEC } from '../../config/quest'
import { todayLocal } from '../../lib/date'
import { supabase } from '../../lib/supabase'
import { useNow } from '../../lib/time'
import type { QuestSession, SessionWithTitle } from '../../types/quest'

type Row = QuestSession & { quests: { title: string } | null }

/** onChange：挑戦・帰還でデータが変わったときに呼ばれる（一覧の読み直し用）。useCallback で作った関数を渡すこと */
export function useQuestSession(onChange?: () => void) {
  const [active, setActive] = useState<SessionWithTitle | null>(null) // 挑戦中
  const [lastResult, setLastResult] = useState<SessionWithTitle | null>(null) // 直前の帰還結果
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const endingRef = useRef(false) // 帰還処理の二重実行を防ぐ印
  const now = useNow()

  // 起動時：挑戦中のクエストがあれば復元する
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('quest_sessions')
        .select('*, quests(title)')
        .is('ended_at', null)
        .maybeSingle<Row>()
      if (cancelled) return
      if (error) setError(error.message)
      else if (data) {
        const { quests, ...session } = data
        setActive({ ...session, title: quests?.title ?? '' })
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const elapsedSec = active
    ? Math.min(MAX_SESSION_SEC, Math.max(0, Math.floor((now - Date.parse(active.started_at)) / 1000)))
    : 0

  // クエストに挑戦
  const start = useCallback(async (title: string) => {
    setError(null)
    setLastResult(null)
    const { data, error } = await supabase.rpc('start_quest', {
      p_title: title,
      p_today: todayLocal(),
    })
    if (error) {
      setError(error.message)
      return false
    }
    setActive({ ...(data as QuestSession), title: title.trim() })
    onChange?.()
    return true
  }, [onChange])

  // 帰還（手動でも自動でもここを通る）
  const end = useCallback(async () => {
    if (!active || endingRef.current) return
    endingRef.current = true
    const { data, error } = await supabase.rpc('end_quest', { p_session_id: active.id })
    endingRef.current = false
    if (error) {
      setError(error.message)
      return
    }
    setLastResult({ ...(data as QuestSession), title: active.title })
    setActive(null)
    onChange?.()
  }, [active, onChange])

  // 2時間に達したら自動で帰還する
  // （end はサーバーの返事を待ってから状態を変えるので、警告は当てはまらない）
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (active && elapsedSec >= MAX_SESSION_SEC) void end()
  }, [active, elapsedSec, end])

  const dismissResult = useCallback(() => setLastResult(null), [])

  return { active, elapsedSec, lastResult, loading, error, start, end, dismissResult }
}
