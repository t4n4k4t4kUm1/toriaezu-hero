import { useState } from 'react'
import { APP_CATCHPHRASE, APP_NAME, APP_VERSION } from './config/app'
import { levelFromXp } from './config/level'
import { NameForm } from './features/auth/NameForm'
import { useAuth } from './features/auth/useAuth'
import { Campfire } from './features/campfire/Campfire'
import { PrivacyToggle } from './features/campfire/PrivacyToggle'
import { useCampfire } from './features/campfire/useCampfire'
import { ChallengeDialog } from './features/quests/ChallengeDialog'
import { QuestActions } from './features/quests/QuestActions'
import { QuestListPage } from './features/quests/QuestListPage'
import { ReserveDialog } from './features/quests/ReserveDialog'
import { useQuests } from './features/quests/useQuests'
import { QuestSessionPanel } from './features/session/QuestSessionPanel'
import { ReturnResult } from './features/session/ReturnResult'
import { useQuestSession } from './features/session/useQuestSession'
import { isSupabaseConfigured } from './lib/supabase'
import type { Profile } from './types/profile'

export default function App() {
  const { state, register, patchProfile } = useAuth()

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

      {state.status === 'ready' && <Home profile={state.profile} onProfileChange={patchProfile} />}

      <footer className="version">v{APP_VERSION}</footer>
    </main>
  )
}

type Page = 'home' | 'quests'
type Dialog = { kind: 'challenge'; title: string } | { kind: 'reserve'; title: string } | null

/** ログイン後の画面 */
function Home({
  profile,
  onProfileChange,
}: {
  profile: Profile
  onProfileChange: (changes: Partial<Profile>) => void
}) {
  const quests = useQuests()
  const session = useQuestSession(quests.refresh)
  const campfire = useCampfire(profile, session.active)
  const [page, setPage] = useState<Page>('home')
  const [dialog, setDialog] = useState<Dialog>(null)

  const busy = session.loading || session.active !== null

  async function startQuest(title: string) {
    const ok = await session.start(title)
    if (ok) {
      setDialog(null)
      setPage('home')
    }
  }

  return (
    <>
      {/* メニュー */}
      <nav className="tabs">
        <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>
          キャンプ
        </button>
        <button className={page === 'quests' ? 'active' : ''} onClick={() => setPage('quests')}>
          クエスト一覧
        </button>
      </nav>

      {(session.error || quests.error) && (
        <p className="error">エラー：{session.error ?? quests.error}</p>
      )}

      {page === 'home' && (
        <div className="layout">
          {/* 焚き火キャンプエリア（スマホ：上 / PC：左） */}
          <section className="camp-area">
            <p>ようこそ、{profile.name} さん</p>
            <p>
              Lv.{levelFromXp(profile.xp)} ／ XP {profile.xp}
            </p>
            {session.active && (
              <QuestSessionPanel
                session={session.active}
                elapsedSec={session.elapsedSec}
                onReturn={session.end}
              />
            )}
            <Campfire campers={campfire.campers} connected={campfire.connected} status={campfire.status} />
            <PrivacyToggle profile={profile} onChange={onProfileChange} />
          </section>

          {/* クエストエリア（スマホ：下 / PC：右） */}
          <QuestActions
            busy={busy}
            todayReservations={quests.todayReservations}
            pinnedQuests={quests.pinnedQuests}
            onOpenChallenge={(title = '') => setDialog({ kind: 'challenge', title })}
            onOpenReserve={() => setDialog({ kind: 'reserve', title: '' })}
            onStart={startQuest}
          />
        </div>
      )}

      {page === 'quests' && (
        <QuestListPage
          quests={quests.quests}
          upcomingReservations={quests.upcomingReservations}
          missedReservations={quests.missedReservations}
          busy={busy}
          onStart={startQuest}
          onReserve={(title) => setDialog({ kind: 'reserve', title })}
          onTogglePin={quests.togglePin}
          onCancelReservation={quests.cancelReservation}
        />
      )}

      {/* 報酬受け取りモーダル（帰還後・受け取っていない報酬があるとき） */}
      {session.unclaimed && !session.active && (
        <ReturnResult
          key={session.unclaimed.id}
          session={session.unclaimed}
          xpBefore={profile.xp}
          onClaim={async (memo, declaredSec) => {
            const r = await session.claim(memo, declaredSec)
            return r
          }}
          onDone={(r) => {
            if (r) onProfileChange({ xp: r.xp })
            void session.closeReward()
          }}
        />
      )}

      {dialog?.kind === 'challenge' && (
        <ChallengeDialog
          recentQuests={quests.recentQuests}
          initialTitle={dialog.title}
          onSubmit={startQuest}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'reserve' && (
        <ReserveDialog
          recentQuests={quests.recentQuests}
          initialTitle={dialog.title}
          onSubmit={async (input) => {
            if (await quests.reserve(input)) setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
