import { APP_CATCHPHRASE, APP_NAME, APP_VERSION } from './config/app'
import { levelFromXp } from './config/level'
import { NameForm } from './features/auth/NameForm'
import { useAuth } from './features/auth/useAuth'
import { ExpeditionPanel } from './features/expedition/ExpeditionPanel'
import { ReturnResult } from './features/expedition/ReturnResult'
import { useExpedition } from './features/expedition/useExpedition'
import { TaskArea } from './features/tasks/TaskArea'
import type { Profile } from './types/profile'
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

      {state.status === 'ready' && <Home profile={state.profile} />}

      <footer className="version">v{APP_VERSION}</footer>
    </main>
  )
}

/** ログイン後のホーム画面（焚き火エリア＋タスクエリア） */
function Home({ profile }: { profile: Profile }) {
  const expedition = useExpedition()

  return (
    <div className="layout">
      {/* 焚き火キャンプエリア（スマホ：上 / PC：左） */}
      <section className="camp-area">
        <p>ようこそ、{profile.name} さん</p>
        <p>
          Lv.{levelFromXp(profile.xp)} ／ XP {profile.xp} ／ {profile.gold}G ／ 薪 {profile.firewood}本
        </p>

        {expedition.error && <p className="error">エラー：{expedition.error}</p>}
        {expedition.active && (
          <ExpeditionPanel
            session={expedition.active}
            elapsedSec={expedition.elapsedSec}
            onReturn={expedition.end}
          />
        )}
        {expedition.lastResult && (
          <ReturnResult session={expedition.lastResult} onClose={expedition.dismissResult} />
        )}
        <p className="muted">（焚き火はステップ6で作る）</p>
      </section>

      {/* タスク＆出撃エリア（スマホ：下 / PC：右） */}
      <TaskArea
        onExpedition={expedition.loading || expedition.active !== null}
        onStart={expedition.start}
      />
    </div>
  )
}
