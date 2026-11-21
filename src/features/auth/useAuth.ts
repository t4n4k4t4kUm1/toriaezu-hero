// ログイン状態とプロフィールを管理する「フック」。
// 画面側はこれを呼ぶだけで「今ログインしているか」「名前は何か」がわかる。
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types/profile'

type AuthState =
  | { status: 'loading' }
  | { status: 'needsName' } // 初めて来た人（名前の入力が必要）
  | { status: 'ready'; profile: Profile }
  | { status: 'error'; message: string }

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  // 起動時：前回のログイン情報（ブラウザに保存されている）を確認する
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const user = data.session?.user
        if (!user) {
          if (!cancelled) setState({ status: 'needsName' })
          return
        }
        const profile = await fetchProfile(user.id)
        if (cancelled) return
        if (profile) {
          setState({ status: 'ready', profile })
          // 最終ログイン時刻を更新（失敗しても困らないので結果は待たない）
          void supabase
            .from('profiles')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', user.id)
        } else {
          setState({ status: 'needsName' })
        }
      } catch (e) {
        if (!cancelled) setState({ status: 'error', message: String(e) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 名前を決めて冒険を始める：匿名ログイン → プロフィール作成
  const register = useCallback(async (name: string) => {
    let { data } = await supabase.auth.getSession()
    let user = data.session?.user
    if (!user) {
      const res = await supabase.auth.signInAnonymously()
      if (res.error) throw res.error
      user = res.data.user ?? undefined
    }
    if (!user) throw new Error('ログインに失敗しました')

    const { error } = await supabase.from('profiles').insert({ id: user.id, name })
    if (error) throw error

    const profile = await fetchProfile(user.id)
    if (!profile) throw new Error('プロフィールの作成に失敗しました')
    setState({ status: 'ready', profile })
  }, [])

  return { state, register }
}
