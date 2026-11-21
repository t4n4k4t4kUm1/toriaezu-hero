-- ステップ4：1回ごとの遠征（作業）記録 work_sessions と、出撃・帰還の関数

create table public.work_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles (id) on delete cascade,
  task_id               uuid not null references public.tasks (id) on delete cascade,
  started_at            timestamptz not null default now(), -- サーバーの時計で記録（端末の時計はずらせるため）
  ended_at              timestamptz,                        -- 遠征中は空
  recorded_duration_sec integer,                            -- システムが計測した時間（上限2時間）
  declared_duration_sec integer,                            -- 自己申告で調整した後の時間（ステップ5）
  is_auto_returned      boolean not null default false,     -- 2時間で自動帰還したか
  memo_log              text check (char_length(memo_log) <= 50), -- 1行冒険日誌（ステップ5）
  reward_rarity         text,                               -- 宝箱のランク（ステップ5）
  earned_xp             integer,
  earned_gold           integer,
  claimed_at            timestamptz                         -- 報酬を受け取った時刻（ステップ5）
);

-- 遠征中（ended_at が空）のセッションは1人1つまで
create unique index work_sessions_one_active_per_user
  on public.work_sessions (user_id) where ended_at is null;

create index work_sessions_started_at_idx on public.work_sessions (started_at);

alter table public.work_sessions enable row level security;

create policy "自分の遠征記録を読める"
  on public.work_sessions for select to authenticated
  using (user_id = (select auth.uid()));

-- 画面側からは読むだけ。作る・終えるのは下の関数だけが行う。
grant select on public.work_sessions to authenticated;


-- 出撃：タスクを指定して遠征を始める
create or replace function public.start_session(p_task_id uuid)
returns public.work_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.work_sessions;
begin
  if v_uid is null then
    raise exception 'ログインしていません';
  end if;

  if not exists (
    select 1 from public.tasks
    where id = p_task_id and user_id = v_uid and status = 'active'
  ) then
    raise exception 'タスクが見つかりません';
  end if;

  if exists (
    select 1 from public.work_sessions
    where user_id = v_uid and ended_at is null
  ) then
    raise exception 'すでに遠征中です';
  end if;

  insert into public.work_sessions (user_id, task_id)
  values (v_uid, p_task_id)
  returning * into v_row;

  update public.tasks
     set attack_count = attack_count + 1,
         last_attacked_at = v_row.started_at
   where id = p_task_id;

  update public.profiles set last_active_at = now() where id = v_uid;

  return v_row;
end;
$$;


-- 帰還：遠征を終える（2時間を超えていたら、2時間ちょうどで止めて「自動帰還」扱い）
create or replace function public.end_session(p_session_id uuid)
returns public.work_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_row   public.work_sessions;
  v_limit timestamptz;
  v_end   timestamptz;
begin
  select * into v_row
    from public.work_sessions
   where id = p_session_id and user_id = v_uid and ended_at is null
   for update;

  if not found then
    raise exception '遠征中のセッションが見つかりません';
  end if;

  v_limit := v_row.started_at + interval '2 hours';
  v_end   := least(now(), v_limit);

  update public.work_sessions
     set ended_at = v_end,
         is_auto_returned = (now() >= v_limit),
         recorded_duration_sec = floor(extract(epoch from (v_end - started_at)))::integer
   where id = p_session_id
  returning * into v_row;

  return v_row;
end;
$$;

-- 関数の実行権限：ログインした人だけ
revoke execute on function public.start_session(uuid) from public, anon;
revoke execute on function public.end_session(uuid) from public, anon;
grant execute on function public.start_session(uuid) to authenticated;
grant execute on function public.end_session(uuid) to authenticated;
