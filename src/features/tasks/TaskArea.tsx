// タスク＆出撃エリア：追加フォーム＋モンスター一覧
import { TaskForm } from './TaskForm'
import type { useTasks } from './useTasks'

type Props = {
  /** タスクの状態と操作（親の Home で useTasks() したもの） */
  tasks: ReturnType<typeof useTasks>
  /** 遠征中かどうか（遠征中は他のタスクに出撃できない） */
  onExpedition: boolean
  /** いま遠征しているタスクのID（なければ null） */
  activeTaskId: string | null
  onStart: (taskId: string, taskTitle: string) => void
}

export function TaskArea({ tasks, onExpedition, activeTaskId, onStart }: Props) {
  const { todayTasks, skippedTasks, loading, error, addTask, completeTask, skipToday, unskip } = tasks

  return (
    <section className="task-area">
      <h2>モンスター一覧</h2>
      <TaskForm onAdd={addTask} />
      {error && <p className="error">エラー：{error}</p>}
      {loading && <p>読み込み中…</p>}

      {!loading && todayTasks.length === 0 && (
        <p className="muted">モンスターはいません。上から追加しよう。</p>
      )}

      <ul className="task-list">
        {todayTasks.map((task) => {
          // 遠征中のモンスターは、帰還するまで完了・見送りできない
          const fighting = task.id === activeTaskId
          return (
            <li key={task.id} className={fighting ? 'task-item fighting' : 'task-item'}>
              <span className="task-title">
                {fighting && <span className="badge">遠征中</span>}
                {task.title}
              </span>
              <div className="task-actions">
                <button
                  className="primary"
                  disabled={onExpedition}
                  onClick={() => onStart(task.id, task.title)}
                >
                  1分だけ触る
                </button>
                <button disabled={fighting} onClick={() => completeTask(task.id)}>
                  討伐完了
                </button>
                <button disabled={fighting} onClick={() => skipToday(task.id)}>
                  今日は見送る
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {skippedTasks.length > 0 && (
        <details className="skipped">
          <summary>今日は見送り中（{skippedTasks.length}）</summary>
          <ul className="task-list">
            {skippedTasks.map((task) => (
              <li key={task.id} className="task-item muted">
                <span className="task-title">{task.title}</span>
                <div className="task-actions">
                  <button onClick={() => unskip(task.id)}>やっぱりやる</button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
