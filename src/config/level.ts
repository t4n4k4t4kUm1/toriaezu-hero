// XP からレベルを計算する（レベルはDBに保存しない）。
// 暫定ルール：次のレベルまでに必要なXPが 100, 200, 300 ... と増えていく。
export function levelFromXp(xp: number): number {
  let level = 1
  let need = 100
  let rest = xp
  while (rest >= need) {
    rest -= need
    level += 1
    need += 100
  }
  return level
}
