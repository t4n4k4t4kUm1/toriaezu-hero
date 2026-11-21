-- ステップ3：タスク定義（tasks）テーブル
-- タスク＝倒すべきモンスター。1回ごとの作業記録（work_sessions）とは分けて持つ。

create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title              text not null check (char_length(title) between 1 and 50),
  status             text not null default 'active' check (status in ('active', 'completed', 'archived')),
  is_pinned          boolean not null default false,
  trigger_config     jsonb,            -- フェーズ2（合図クエスト）用。MVPでは使わない
  skipped_on         date,             -- 「今日は見送る」を押した日。日付が変われば自動で元に戻る
  total_duration_sec integer not null default 0 check (total_duration_sec >= 0),
  attack_count       integer not null default 0 check (attack_count >= 0),
  last_attacked_at   timestamptz,
  created_at         timestamptz not null default now()
);

create index tasks_user_status_idx on public.tasks (user_id, status);

-- RLS：自分のタスクだけ
alter table public.tasks enable row level security;

create policy "自分のタスクを読める"
  on public.tasks for select to authenticated
  using (user_id = (select auth.uid()));

create policy "自分のタスクを作れる"
  on public.tasks for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "自分のタスクを更新できる"
  on public.tasks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 権限（2026年以降のSupabaseでは明示が必要）
-- 作業時間・出撃回数などの集計列は、画面側から書き換えられないようにする。
grant select on public.tasks to authenticated;
grant insert (title, is_pinned) on public.tasks to authenticated;
grant update (title, status, is_pinned, skipped_on) on public.tasks to authenticated;
