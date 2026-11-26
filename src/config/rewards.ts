// 報酬まわりの表示用の値（暫定値）
// 実際の計算は DB の claim_reward 関数で行う。数値を変えるときは両方そろえること。
import { FIRST_STRIKE_SEC } from './quest'

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

/** 自動帰還したときの「実際の作業時間」の選択肢 */
export const DECLARE_OPTIONS: { label: string; sec: number | null }[] = [
  { label: '1分〜15分', sec: 15 * 60 },
  { label: '30分', sec: 30 * 60 },
  { label: '1時間', sec: 60 * 60 },
  { label: '2時間そのまま', sec: null }, // null ＝ 記録どおり
]
