// タスクの読み込み・追加・討伐完了・見送りをまとめた「フック」
import { useCallback, useEffect, useState } from 'react'
import { todayLocal } from '../../lib/date'
import { supabase } from '../../lib/supabase'
import type { Task } from '../../types/task'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 未完了（active）のタスクだけを、新しい順に読み込む
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) setError(error.message)
      else setTasks(data ?? [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 1行を書き換えて、画面のリストにも反映する共通処理
  const updateTask = useCallback(async (id: string, changes: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      setError(error.message)
      return
    }
    setTasks((prev) =>
      data.status === 'active'
        ? prev.map((t) => (t.id === id ? data : t))
        : prev.filter((t) => t.id !== id), // 討伐完了したものはリストから消す
    )
  }, [])

  const addTask = useCallback(async (title: string) => {
    const { data, error } = await supabase.from('tasks').insert({ title }).select().single()
    if (error) {
      setError(error.message)
      return
    }
    setTasks((prev) => [data, ...prev])
  }, [])

  const completeTask = useCallback((id: string) => updateTask(id, { status: 'completed' }), [updateTask])
  const skipToday = useCallback((id: string) => updateTask(id, { skipped_on: todayLocal() }), [updateTask])
  const unskip = useCallback((id: string) => updateTask(id, { skipped_on: null }), [updateTask])

  // 「今日のタスク」と「今日は見送り中」に分ける
  const today = todayLocal()
  const todayTasks = tasks.filter((t) => t.skipped_on !== today)
  const skippedTasks = tasks.filter((t) => t.skipped_on === today)

  return { todayTasks, skippedTasks, loading, error, addTask, completeTask, skipToday, unskip }
}
