// 遠征タイマーの決まりごと

/** 先制攻撃成功（＝報酬確定）までの秒数 */
export const FIRST_STRIKE_SEC = 60

/** 1回の遠征の上限（自然消火）。DBの end_session 関数と同じ値にすること */
export const MAX_SESSION_SEC = 2 * 60 * 60
