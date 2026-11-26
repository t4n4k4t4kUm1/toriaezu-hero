// 焚き火（ほかのユーザーの表示）を管理する「フック」
//
//  ・オンラインの人：Supabase Realtime の Presence で共有する。
//    Presence は「今この部屋にいる人の名簿」のようなもの。部屋に入ると自分の名前が全員の名簿に載り、
//    タブを閉じると自動で消える。名簿の各行には「何のクエストに挑戦中か」も書いておける。
//  ・オフラインの人：最近アクセスした人を DB から取り出して、薄暗く表示する。
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types/profile'
import type { SessionWithTitle } from '../../types/quest'

/** 焚き火に表示する人数の上限（自分を含む） */
const MAX_CAMPERS = 15
/** 最終オンライン時刻を更新する間隔・オフラインの人を読み直す間隔 */
const REFRESH_MS = 60 * 1000

/** Presence の名簿に載せる内容 */
type PresencePayload = {
  user_id: string
  name: string
  quest_title: string | null // 隠す設定なら null
  quest_started_at: string | null // 挑戦中でなければ null
}

export type Camper = {
  id: string
  name: string
  isMe: boolean
  status: 'questing' | 'online' | 'offline'
  questTitle: string | null
  questStartedAt: string | null
  lastActiveAt: string | null
}

type RecentRow = { id: string; name: string; last_active_at: string }

export function useCampfire(profile: Profile, active: SessionWithTitle | null) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [online, setOnline] = useState<Map<string, PresencePayload>>(new Map())
  const [recent, setRecent] = useState<RecentRow[]>([])

  // 1) 焚き火チャンネルに入る（ページを開いている間ずっと）
  useEffect(() => {
    const channel = supabase.channel('campfire', {
      config: { private: true, presence: { key: profile.id } },
    })
    channelRef.current = channel

    // 名簿が変わるたびに、オンラインの人の一覧を作り直す
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresencePayload>()
      const map = new Map<string, PresencePayload>()
      for (const [key, entries] of Object.entries(state)) {
        // 同じ人が複数のタブで開いていたら、挑戦中の情報があるものを優先する
        const best = entries.find((e) => e.quest_started_at) ?? entries[0]
        if (best) map.set(key, best)
      }
      setOnline(map)
    })

    ;(async () => {
      await supabase.realtime.setAuth() // private チャンネルなので、ログイン情報を渡す
      channel.subscribe((status) => setSubscribed(status === 'SUBSCRIBED'))
    })()

    return () => {
      setSubscribed(false)
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [profile.id])

  // 2) 自分の状態（挑戦中のクエストなど）が変わったら、名簿の自分の行を書き換える
  const payload = useMemo<PresencePayload>(
    () => ({
      user_id: profile.id,
      name: profile.name,
      quest_title: active && !profile.hide_quest_title ? active.title : null,
      quest_started_at: active ? active.started_at : null,
    }),
    [profile.id, profile.name, profile.hide_quest_title, active],
  )
  useEffect(() => {
    if (subscribed) void channelRef.current?.track(payload)
  }, [subscribed, payload])

  // 3) オフラインの人を読み込む＋自分の最終オンライン時刻を更新する（1分ごと）
  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      void supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', profile.id)
      const { data } = await supabase.rpc('get_recent_campers', { p_limit: MAX_CAMPERS })
      if (!cancelled && data) setRecent(data as RecentRow[])
    }
    void refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [profile.id])

  // 4) 表示用にまとめる：自分 → 挑戦中 → オンライン → オフライン（最近の順）
  const campers = useMemo<Camper[]>(() => {
    const me: Camper = {
      id: profile.id,
      name: profile.name,
      isMe: true,
      status: active ? 'questing' : 'online',
      questTitle: active?.title ?? null,
      questStartedAt: active?.started_at ?? null,
      lastActiveAt: null,
    }
    const others: Camper[] = []
    for (const p of online.values()) {
      if (p.user_id === profile.id) continue
      others.push({
        id: p.user_id,
        name: p.name,
        isMe: false,
        status: p.quest_started_at ? 'questing' : 'online',
        questTitle: p.quest_title,
        questStartedAt: p.quest_started_at,
        lastActiveAt: null,
      })
    }
    const rank = { questing: 0, online: 1, offline: 2 }
    others.sort((a, b) => rank[a.status] - rank[b.status])
    for (const r of recent) {
      if (online.has(r.id)) continue
      others.push({
        id: r.id,
        name: r.name,
        isMe: false,
        status: 'offline',
        questTitle: null,
        questStartedAt: null,
        lastActiveAt: r.last_active_at,
      })
    }
    return [me, ...others].slice(0, MAX_CAMPERS)
  }, [profile.id, profile.name, active, online, recent])

  return { campers, connected: subscribed }
}
