// tasks テーブル1行分の形
export type TaskStatus = 'active' | 'completed' | 'archived'

export type Task = {
  id: string
  user_id: string
  title: string
  status: TaskStatus
  is_pinned: boolean
  skipped_on: string | null // 'YYYY-MM-DD'
  total_duration_sec: number
  attack_count: number
  last_attacked_at: string | null
  created_at: string
}
