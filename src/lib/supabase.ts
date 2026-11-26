// Supabase につなぐための設定をまとめたファイル。
// アプリのどこからでも、ここで作った `supabase` を読み込んで使う。
import { createClient } from '@supabase/supabase-js'

// .env.local に書いた値を読み込む（GitHubには上げないファイル）
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** URL とキーが両方そろっているか */
export const isSupabaseConfigured = Boolean(url && key)

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key', {
  realtime: {
    // 裏に回したタブでも接続が切れないようにする。
    // ブラウザは見ていないタブのタイマーを間引くので、「生きてるよ」の合図（ハートビート）が遅れて
    // 接続が切れてしまう。Web Worker（裏で動く別の作業員）に合図を任せると、間引かれにくくなる。
    worker: true,
  },
})
