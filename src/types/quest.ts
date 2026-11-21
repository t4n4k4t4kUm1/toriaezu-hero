// クエストまわりのデータの形

/** クエストの種類（クエスト一覧に出るもの） */
export type Quest = {
  id: string
  user_id: string
  title: string
  is_pinned: boolean
  total_duration_sec: number
  attempt_count: number
  last_attempted_at: string | null
  created_at: string
}

/** クエストの予約 */
export type QuestReservation = {
  id: string
  user_id: string
  quest_id: string
  scheduled_date: string // 'YYYY-MM-DD'
  scheduled_time: string | null // 'HH:MM:SS'
  trigger_text: string | null
  fulfilled_at: string | null
  fulfilled_session_id: string | null
  created_at: string
}

/** 予約にクエスト名をくっつけたもの */
export type ReservationWithTitle = QuestReservation & { title: string }

/** 1回ごとの挑戦の記録 */
export type QuestSession = {
  id: string
  user_id: string
  quest_id: string
  reservation_id: string | null
  started_at: string
  ended_at: string | null
  recorded_duration_sec: number | null
  declared_duration_sec: number | null
  is_auto_returned: boolean
  memo_log: string | null
  reward_rarity: string | null
  earned_xp: number | null
  earned_gold: number | null
  claimed_at: string | null
}

export type SessionWithTitle = QuestSession & { title: string }

/** 予約フォームで入力する内容 */
export type ReserveInput = {
  title: string
  date: string // 'YYYY-MM-DD'
  time: string | null // 'HH:MM'
  trigger: string | null
}
