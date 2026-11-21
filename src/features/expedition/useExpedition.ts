// 遠征（作業セッション）の状態を管理する「フック」
import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_SESSION_SEC } from '../../config/expedition'
import { supabase } from '../../lib/supabase'
import { useNow } from '../../lib/time'
import type { SessionWithTask, WorkSession } from '../../types/workSession'

type Row = WorkSession & { tasks: { title: string } | null }

export function useExpedition() {
  const [active, setActive] = useState<SessionWithTask | null>(null) // 遠征中のセッション
  const [lastResult, setLastResult] = useState<SessionWithTask | null>(null) // 直前に帰還したセッション
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const endingRef = useRef(false) // 帰還処理の二重実行を防ぐ印
  const now = useNow()

  // 起動時：遠征中のセッションがあれば復元する（再読み込みしても続きから）
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*, tasks(title)')
        .is('ended_at', null)
        .maybeSingle<Row>()
      if (cancelled) return
      if (error) setError(error.message)
      else if (data) {
        const { tasks, ...session } = data
        setActive({ ...session, taskTitle: tasks?.title ?? '' })
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 経過秒数（開始時刻との差。上限は2時間）
  const elapsedSec = active
    ? Math.min(MAX_SESSION_SEC, Math.max(0, Math.floor((now - Date.parse(active.started_at)) / 1000)))
    : 0

  // 出撃
  const start = useCallback(async (taskId: string, taskTitle: string) => {
    setError(null)
    setLastResult(null)
    const { data, error } = await supabase.rpc('start_session', { p_task_id: taskId })
    if (error) {
      setError(error.message)
      return
    }
    setActive({ ...(data as WorkSession), taskTitle })
  }, [])

  // 帰還（手動でも自動でもここを通る。2時間超えの判定はDB側で行う）
  const end = useCallback(async () => {
    if (!active || endingRef.current) return
    endingRef.current = true
    const { data, error } = await supabase.rpc('end_session', { p_session_id: active.id })
    endingRef.current = false
    if (error) {
      setError(error.message)
      return
    }
    setLastResult({ ...(data as WorkSession), taskTitle: active.taskTitle })
    setActive(null)
  }, [active])

  // 2時間に達したら自動で帰還する（画面を開いた時点で超えていた場合も含む）
  // （end はサーバーへの問い合わせが終わってから状態を変えるので、警告は当てはまらない）
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (active && elapsedSec >= MAX_SESSION_SEC) void end()
  }, [active, elapsedSec, end])

  const dismissResult = useCallback(() => setLastResult(null), [])

  return { active, elapsedSec, lastResult, loading, error, start, end, dismissResult }
}
