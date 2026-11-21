// work_sessions テーブル1行分の形
export type WorkSession = {
  id: string
  user_id: string
  task_id: string
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

/** 画面で使うために、タスク名を一緒に持たせたもの */
export type SessionWithTask = WorkSession & { taskTitle: string }
