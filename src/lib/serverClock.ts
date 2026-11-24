// サーバーの時計と端末の時計の「ずれ」を測って、表示をサーバーの時計に合わせる仕組み。
//
// 挑戦の開始・終了時刻はサーバーの時計で記録している。
// 一方、画面のタイマーは端末の時計で計算するので、端末の時計がずれていると
// 「画面では1分5秒なのに、記録では56秒」のような食い違いが起きる。
// そこで、起動時にサーバーへ時刻を聞いて、ずれ（offset）を覚えておく。
import { supabase } from './supabase'

/** サーバーの時計 − 端末の時計（ミリ秒）。プラスなら端末が遅れている */
let offsetMs = 0

/** サーバーの時計に合わせた「今」（ミリ秒） */
export function serverNow(): number {
  return Date.now() + offsetMs
}

/** サーバーに時刻を聞いて、ずれを測り直す */
export async function syncServerClock(): Promise<void> {
  const sentAt = Date.now()
  const { data, error } = await supabase.rpc('server_now')
  const receivedAt = Date.now()
  if (error || typeof data !== 'string') return // 失敗したら、前のずれのまま使う

  // 行きと帰りの通信時間は同じくらいと考えて、往復時間の半分を足す
  const serverAtReceive = Date.parse(data) + (receivedAt - sentAt) / 2
  offsetMs = serverAtReceive - receivedAt
}
