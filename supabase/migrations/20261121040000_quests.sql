-- 仕様変更：「タスク／遠征」を「クエスト」に整理し、予約機能を追加する
--
--   quests              … クエストの種類（過去に挑戦・予約したもの）。クエスト一覧に出る
--   quest_reservations  … クエストの予約（日付＋時刻 or 合図）
--   quest_sessions      … 1回ごとの挑戦の記録（旧 work_sessions）
--
-- 旧テーブル（tasks / work_sessions）はテストデータしかないため、作り直す。

drop function if exists public.start_session(uuid);
drop function if exists public.end_session(uuid);
drop table if exists public.work_sessions;
drop table if exists public.tasks;


-- ===== クエスト（種類） =====
create table public.quests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  title              text not null check (char_length(title) between 1 and 50),
  is_pinned          boolean not null default false,  -- ホームに表示するか
  total_duration_sec integer not null default 0 check (total_duration_sec >= 0),
  attempt_count      integer not null default 0 check (attempt_count >= 0),
  last_attempted_at  timestamptz,
  created_at         timestamptz not null default now(),
  unique (user_id, title)  -- 同じ名前のクエストは1つにまとめる
);

-- ===== 予約 =====
create table public.quest_reservations (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  quest_id             uuid not null references public.quests (id) on delete cascade,
  scheduled_date       date not null,          -- やる日
  scheduled_time       time,                   -- 何時にやるか（どちらか一方、または両方なし）
  trigger_text         text check (char_length(trigger_text) between 1 and 30), -- 合図（例：お風呂から上がったら）
  fulfilled_at         timestamptz,            -- 達成した時刻（その日に1分以上挑戦したら達成）
  fulfilled_session_id uuid,
  created_at           timestamptz not null default now(),
  check (scheduled_time is null or trigger_text is null)
);
-- 「見送ったクエスト」は列で持たず、「予約日が過ぎていて未達成」で判定する（罰はなし）

-- ===== 挑戦の記録 =====
create table public.quest_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles (id) on delete cascade,
  quest_id              uuid not null references public.quests (id) on delete cascade,
  reservation_id        uuid references public.quest_reservations (id) on delete set null,
  started_at            timestamptz not null default now(), -- サーバーの時計で記録
  ended_at              timestamptz,                        -- 挑戦中は空
  recorded_duration_sec integer,                            -- システム計測（上限2時間）
  declared_duration_sec integer,                            -- 自己申告後（ステップ5）
  is_auto_returned      boolean not null default false,
  memo_log              text check (char_length(memo_log) <= 50),
  reward_rarity         text,
  earned_xp             integer,
  earned_gold           integer,
  claimed_at            timestamptz
);

alter table public.quest_reservations
  add constraint quest_reservations_fulfilled_session_fk
  foreign key (fulfilled_session_id) references public.quest_sessions (id) on delete set null;

create unique index quest_sessions_one_active_per_user
  on public.quest_sessions (user_id) where ended_at is null;
create index quest_sessions_started_at_idx on public.quest_sessions (started_at);
create index quest_reservations_user_date_idx on public.quest_reservations (user_id, scheduled_date);


-- ===== RLS：自分の行だけ =====
alter table public.quests enable row level security;
alter table public.quest_reservations enable row level security;
alter table public.quest_sessions enable row level security;

create policy "自分のクエストを読める" on public.quests for select to authenticated
  using (user_id = (select auth.uid()));
create policy "自分のクエストを更新できる" on public.quests for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "自分の予約を読める" on public.quest_reservations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "未達成の自分の予約を取り消せる" on public.quest_reservations for delete to authenticated
  using (user_id = (select auth.uid()) and fulfilled_at is null);

create policy "自分の挑戦記録を読める" on public.quest_sessions for select to authenticated
  using (user_id = (select auth.uid()));

-- ===== 権限（2026年以降のSupabaseでは明示が必要） =====
grant select on public.quests to authenticated;
grant update (is_pinned) on public.quests to authenticated;   -- 画面から変えられるのはピン留めだけ
grant select, delete on public.quest_reservations to authenticated;
grant select on public.quest_sessions to authenticated;
-- 作成・挑戦・帰還は、下の関数だけが行う


-- ===== 関数 =====

-- （内部用）名前からクエストを探し、なければ作って、IDを返す
create or replace function public.ensure_quest(p_uid uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.quests (user_id, title)
  values (p_uid, p_title)
  on conflict (user_id, title) do update set title = excluded.title
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.ensure_quest(uuid, text) from public, anon, authenticated;


-- クエストに挑戦（p_today は利用者の端末での「今日」。その日の予約があれば結びつける）
create or replace function public.start_quest(p_title text, p_today date)
returns public.quest_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_title text := btrim(p_title);
  v_quest uuid;
  v_res   uuid;
  v_row   public.quest_sessions;
begin
  if v_uid is null then raise exception 'ログインしていません'; end if;
  if v_title = '' or char_length(v_title) > 50 then
    raise exception 'クエスト名は1〜50文字で入力してください';
  end if;
  if exists (select 1 from public.quest_sessions where user_id = v_uid and ended_at is null) then
    raise exception 'すでにクエストに挑戦中です';
  end if;

  v_quest := public.ensure_quest(v_uid, v_title);

  select id into v_res
    from public.quest_reservations
   where user_id = v_uid and quest_id = v_quest
     and scheduled_date = p_today and fulfilled_at is null
   order by created_at
   limit 1;

  insert into public.quest_sessions (user_id, quest_id, reservation_id)
  values (v_uid, v_quest, v_res)
  returning * into v_row;

  update public.quests
     set attempt_count = attempt_count + 1, last_attempted_at = v_row.started_at
   where id = v_quest;
  update public.profiles set last_active_at = now() where id = v_uid;

  return v_row;
end;
$$;


-- 帰還（2時間を超えていたら2時間で止めて自動帰還扱い。1分以上なら予約を達成にする）
create or replace function public.end_quest(p_session_id uuid)
returns public.quest_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_row   public.quest_sessions;
  v_limit timestamptz;
  v_end   timestamptz;
begin
  select * into v_row
    from public.quest_sessions
   where id = p_session_id and user_id = v_uid and ended_at is null
   for update;
  if not found then raise exception '挑戦中のクエストが見つかりません'; end if;

  v_limit := v_row.started_at + interval '2 hours';
  v_end   := least(now(), v_limit);

  update public.quest_sessions
     set ended_at = v_end,
         is_auto_returned = (now() >= v_limit),
         recorded_duration_sec = floor(extract(epoch from (v_end - started_at)))::integer
   where id = p_session_id
  returning * into v_row;

  if v_row.reservation_id is not null and v_row.recorded_duration_sec >= 60 then
    update public.quest_reservations
       set fulfilled_at = v_row.ended_at, fulfilled_session_id = v_row.id
     where id = v_row.reservation_id and fulfilled_at is null;
  end if;

  return v_row;
end;
$$;


-- クエストを予約（時刻と合図はどちらか一方、または両方なし）
create or replace function public.reserve_quest(
  p_title   text,
  p_date    date,
  p_time    time default null,
  p_trigger text default null
)
returns public.quest_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_title   text := btrim(p_title);
  v_trigger text := nullif(btrim(coalesce(p_trigger, '')), '');
  v_quest   uuid;
  v_row     public.quest_reservations;
begin
  if v_uid is null then raise exception 'ログインしていません'; end if;
  if v_title = '' or char_length(v_title) > 50 then
    raise exception 'クエスト名は1〜50文字で入力してください';
  end if;
  if p_date is null then raise exception '日付を選んでください'; end if;

  v_quest := public.ensure_quest(v_uid, v_title);

  insert into public.quest_reservations (user_id, quest_id, scheduled_date, scheduled_time, trigger_text)
  values (v_uid, v_quest, p_date, p_time, v_trigger)
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.start_quest(text, date) from public, anon;
revoke execute on function public.end_quest(uuid) from public, anon;
revoke execute on function public.reserve_quest(text, date, time, text) from public, anon;
grant execute on function public.start_quest(text, date) to authenticated;
grant execute on function public.end_quest(uuid) to authenticated;
grant execute on function public.reserve_quest(text, date, time, text) to authenticated;
