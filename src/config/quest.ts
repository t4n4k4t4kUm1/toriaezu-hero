// クエスト挑戦（タイマー）の決まりごと

/** 先制攻撃成功（＝報酬確定）までの秒数 */
export const FIRST_STRIKE_SEC = 60

/** 1回の挑戦の上限（自然消火）。DBの end_quest 関数と同じ値にすること */
export const MAX_SESSION_SEC = 2 * 60 * 60
