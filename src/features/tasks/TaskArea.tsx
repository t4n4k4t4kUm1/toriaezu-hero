// タスク＆出撃エリア：追加フォーム＋モンスター一覧
import { TaskForm } from './TaskForm'
import { useTasks } from './useTasks'

export function TaskArea() {
  const { todayTasks, skippedTasks, loading, error, addTask, completeTask, skipToday, unskip } =
    useTasks()

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
        {todayTasks.map((task) => (
          <li key={task.id} className="task-item">
            <span className="task-title">{task.title}</span>
            <div className="task-actions">
              {/* ステップ4で遠征タイマーにつなぐ */}
              <button className="primary" disabled title="ステップ4で実装">
                1分だけ触る
              </button>
              <button onClick={() => completeTask(task.id)}>討伐完了</button>
              <button onClick={() => skipToday(task.id)}>今日は見送る</button>
            </div>
          </li>
        ))}
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
