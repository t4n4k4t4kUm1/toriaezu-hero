-- ステップ2：ユーザー情報（profiles）テーブル
-- Supabase の認証ユーザー（auth.users）1人につき、1行のプロフィールを持つ。

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 20),
  avatar_type    text not null default 'hero',
  xp             integer not null default 0 check (xp >= 0),
  gold           integer not null default 0 check (gold >= 0),
  firewood       integer not null default 0 check (firewood >= 0),
  created_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

-- RLS（行レベルセキュリティ）：自分の行だけを読み書きできるようにする
alter table public.profiles enable row level security;

create policy "自分のプロフィールを読める"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "自分のプロフィールを作れる"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "自分のプロフィールを更新できる"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 列ごとの権限：xp・gold・firewood は画面側から書き換えられないようにする。
-- （これらは後のステップで作る「報酬を計算するDB関数」だけが増やせる）
revoke insert, update on public.profiles from authenticated, anon;
grant insert (id, name, avatar_type) on public.profiles to authenticated;
grant update (name, avatar_type, last_active_at) on public.profiles to authenticated;
