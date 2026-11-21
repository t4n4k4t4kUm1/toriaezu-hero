// 日付の小道具

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 利用者の端末の時刻で「今日」を 'YYYY-MM-DD' の形で返す */
export function todayLocal(): string {
  return toYmd(new Date())
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** 'YYYY-MM-DD' を「11/21(土)」の形にする */
export function formatDateJa(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${m}/${d}(${WEEKDAYS[date.getDay()]})`
}

/** 'HH:MM:SS' を「21:00」の形にする */
export function formatTime(hms: string): string {
  return hms.slice(0, 5)
}
