// 日付の小道具

/** 利用者の端末の時刻で「今日」を 'YYYY-MM-DD' の形で返す */
export function todayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
