// クエスト挑戦中（タイマー）と、帰還後の報酬受け取りを管理する「フック」
import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_SESSION_SEC } from '../../config/quest'
import { todayLocal } from '../../lib/date'
import { syncServerClock } from '../../lib/serverClock'
import { supabase } from '../../lib/supabase'
import { useNow } from '../../lib/time'
import type { ClaimResult, QuestSession, SessionWithTitle } from '../../types/quest'

type Row = QuestSession & { quests: { title: string } | null }

const toSession = ({ quests, ...session }: Row): SessionWithTitle => ({
  ...session,
  title: quests?.title ?? '',
})

/** 帰還したのに報酬をまだ受け取っていない挑戦を、古い順に1つ探す */
async function fetchUnclaimed() {
  return supabase
    .from('quest_sessions')
    .select('*, quests(title)')
    .not('ended_at', 'is', null)
    .is('claimed_at', null)
    .order('ended_at')
    .limit(1)
    .maybeSingle<Row>()
}

/** onChange：挑戦・帰還・受け取りでデータが変わったときに呼ばれる（一覧の読み直し用）。useCallback で作った関数を渡すこと */
export function useQuestSession(onChange?: () => void) {
  const [active, setActive] = useState<SessionWithTitle | null>(null) // 挑戦中
  const [unclaimed, setUnclaimed] = useState<SessionWithTitle | null>(null) // 報酬の受け取り待ち
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const endingRef = useRef(false) // 帰還処理の二重実行を防ぐ印
  const now = useNow()

  // 起動時：挑戦中のクエストと、受け取っていない報酬を探す
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [, act, unc] = await Promise.all([
        syncServerClock(), // 時計のずれも同時に測る
        supabase.from('quest_sessions').select('*, quests(title)').is('ended_at', null).maybeSingle<Row>(),
        fetchUnclaimed(),
      ])
      if (cancelled) return
      if (act.error || unc.error) setError((act.error ?? unc.error)!.message)
      if (act.data) setActive(toSession(act.data))
      if (unc.data) setUnclaimed(toSession(unc.data))
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
  const start = useCallback(
    async (title: string) => {
      setError(null)
      // 挑戦の開始と同時に、時計のずれも測り直す（スマホのスリープ明けなどに備えて）
      const [, { data, error }] = await Promise.all([
        syncServerClock(),
        supabase.rpc('start_quest', { p_title: title, p_today: todayLocal() }),
      ])
      if (error) {
        setError(error.message)
        return false
      }
      setActive({ ...(data as QuestSession), title: title.trim() })
      onChange?.()
      return true
    },
    [onChange],
  )

  // 帰還（手動でも自動でもここを通る）→ 報酬の受け取り待ちにする
  const end = useCallback(async () => {
    if (!active || endingRef.current) return
    endingRef.current = true
    const { data, error } = await supabase.rpc('end_quest', { p_session_id: active.id })
    endingRef.current = false
    if (error) {
      setError(error.message)
      return
    }
    setUnclaimed({ ...(data as QuestSession), title: active.title })
    setActive(null)
    onChange?.()
  }, [active, onChange])

  // 2時間に達したら自動で帰還する
  // （end はサーバーの返事を待ってから状態を変えるので、警告は当てはまらない）
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (active && elapsedSec >= MAX_SESSION_SEC) void end()
  }, [active, elapsedSec, end])

  // 報酬を受け取る（宝箱を開ける）。結果を返す
  const claim = useCallback(
    async (memo: string | null, declaredSec: number | null): Promise<ClaimResult | null> => {
      if (!unclaimed) return null
      const { data, error } = await supabase.rpc('claim_reward', {
        p_session_id: unclaimed.id,
        p_memo: memo,
        p_declared_sec: declaredSec,
      })
      if (error) {
        setError(error.message)
        return null
      }
      onChange?.()
      return data as ClaimResult
    },
    [unclaimed, onChange],
  )

  // 結果画面を閉じたら、ほかに受け取り待ちがないか確認する
  const closeReward = useCallback(async () => {
    setUnclaimed(null)
    const { data } = await fetchUnclaimed()
    if (data) setUnclaimed(toSession(data))
  }, [])

  return { active, elapsedSec, unclaimed, loading, error, start, end, claim, closeReward }
}
