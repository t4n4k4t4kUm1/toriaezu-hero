// クエストの種類と予約をまとめて管理する「フック」
import { useCallback, useEffect, useState } from 'react'
import { todayLocal } from '../../lib/date'
import { supabase } from '../../lib/supabase'
import type { Quest, QuestReservation, ReservationWithTitle, ReserveInput } from '../../types/quest'

export function useQuests() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [reservations, setReservations] = useState<QuestReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // サーバーから読み直す（挑戦・帰還・予約のあとにも呼ぶ）
  const refresh = useCallback(async () => {
    const today = todayLocal()
    const [q, r] = await Promise.all([
      supabase
        .from('quests')
        .select('*')
        .order('last_attempted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      // 未達成の予約すべて＋今日の達成済み予約
      supabase
        .from('quest_reservations')
        .select('*')
        .or(`fulfilled_at.is.null,scheduled_date.eq.${today}`)
        .order('scheduled_date')
        .order('scheduled_time', { nullsFirst: false }),
    ])
    if (q.error || r.error) {
      setError((q.error ?? r.error)!.message)
    } else {
      setQuests(q.data ?? [])
      setReservations(r.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // 初回の読み込み（状態の更新はサーバーの返事を待ってから行われる）
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh()
  }, [refresh])

  const reserve = useCallback(
    async (input: ReserveInput) => {
      const { error } = await supabase.rpc('reserve_quest', {
        p_title: input.title,
        p_date: input.date,
        p_time: input.time,
        p_trigger: input.trigger,
      })
      if (error) {
        setError(error.message)
        return false
      }
      await refresh()
      return true
    },
    [refresh],
  )

  const cancelReservation = useCallback(async (id: string) => {
    const { error } = await supabase.from('quest_reservations').delete().eq('id', id)
    if (error) setError(error.message)
    else setReservations((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const togglePin = useCallback(async (quest: Quest) => {
    const { error } = await supabase
      .from('quests')
      .update({ is_pinned: !quest.is_pinned })
      .eq('id', quest.id)
    if (error) setError(error.message)
    else
      setQuests((prev) =>
        prev.map((q) => (q.id === quest.id ? { ...q, is_pinned: !q.is_pinned } : q)),
      )
  }, [])

  // ---- 画面で使いやすい形に振り分ける ----
  const today = todayLocal()
  const titleOf = new Map(quests.map((q) => [q.id, q.title]))
  const withTitle = (r: QuestReservation): ReservationWithTitle => ({
    ...r,
    title: titleOf.get(r.quest_id) ?? '',
  })

  const todayReservations = reservations.filter((r) => r.scheduled_date === today).map(withTitle)
  const upcomingReservations = reservations
    .filter((r) => r.scheduled_date > today && !r.fulfilled_at)
    .map(withTitle)
  // 予約日が過ぎても未達成のもの＝見送ったクエスト（罰はなし）
  const missedReservations = reservations
    .filter((r) => r.scheduled_date < today && !r.fulfilled_at)
    .map(withTitle)
    .reverse()

  const pinnedQuests = quests.filter((q) => q.is_pinned)
  const recentQuests = quests.filter((q) => q.attempt_count > 0).slice(0, 5)

  return {
    quests,
    pinnedQuests,
    recentQuests,
    todayReservations,
    upcomingReservations,
    missedReservations,
    loading,
    error,
    refresh,
    reserve,
    cancelReservation,
    togglePin,
  }
}
