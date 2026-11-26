// profiles テーブル1行分の形
export type Profile = {
  id: string
  name: string
  avatar_type: string
  xp: number
  hide_quest_title: boolean // ほかの人にクエスト名を見せない
  created_at: string
  last_active_at: string
}
