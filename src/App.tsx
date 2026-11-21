import { APP_CATCHPHRASE, APP_NAME, APP_VERSION } from './config/app'
import { levelFromXp } from './config/level'
import { NameForm } from './features/auth/NameForm'
import { useAuth } from './features/auth/useAuth'
import { isSupabaseConfigured } from './lib/supabase'

export default function App() {
  const { state, register } = useAuth()

  return (
    <main className="app">
      <header>
        <h1>{APP_NAME}</h1>
        <p className="catchphrase">{APP_CATCHPHRASE}</p>
      </header>

      {!isSupabaseConfigured && <p className="error">Supabase が未設定です（.env.local を確認）</p>}

      {state.status === 'loading' && <p>読み込み中…</p>}
      {state.status === 'error' && <p className="error">エラー：{state.message}</p>}
      {state.status === 'needsName' && <NameForm onSubmit={register} />}

      {state.status === 'ready' && (
        <section className="status-panel">
          <p>ようこそ、{state.profile.name} さん</p>
          <p>
            Lv.{levelFromXp(state.profile.xp)} ／ XP {state.profile.xp} ／ {state.profile.gold}G ／ 薪{' '}
            {state.profile.firewood}本
          </p>
          {/* ステップ3以降：ここに焚き火エリアとタスクエリアを置く */}
        </section>
      )}

      <footer className="version">v{APP_VERSION}</footer>
    </main>
  )
}
