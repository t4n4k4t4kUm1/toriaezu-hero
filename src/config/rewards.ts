// 報酬まわりの数値（暫定値。あとで調整する）
import { FIRST_STRIKE_SEC } from './expedition'

export type ChestRank = 'none' | 'wood' | 'silver' | 'gold'

export const CHEST_LABEL: Record<ChestRank, string> = {
  none: 'なし',
  wood: '木の宝箱',
  silver: '銀の宝箱',
  gold: '金の宝箱',
}

/** 作業時間（秒）から宝箱のランクを決める */
export function chestRankFromSec(sec: number): ChestRank {
  if (sec < FIRST_STRIKE_SEC) return 'none'
  if (sec < 30 * 60) return 'wood'
  if (sec < 60 * 60) return 'silver'
  return 'gold'
}
