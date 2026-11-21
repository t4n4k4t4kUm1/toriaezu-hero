import { APP_CATCHPHRASE, APP_NAME, APP_VERSION } from './config/app'
import { isSupabaseConfigured } from './lib/supabase'

// ステップ1：公開URLの確認用の仮画面。
// ステップ2以降で、焚き火エリアとタスクエリアに置き換えていく。
export default function App() {
  return (
    <main className="app">
      <h1>{APP_NAME}</h1>
      <p className="catchphrase">{APP_CATCHPHRASE}</p>
      <p className="status">
        Supabase：{isSupabaseConfigured ? '設定済み' : '未設定（.env.local を確認）'}
      </p>
      <p className="version">v{APP_VERSION}</p>
    </main>
  )
}
