-- ステップ6：焚き火（ほかのユーザーの表示）
--
-- ・今オンラインの人 …… Supabase Realtime の Presence（「今この部屋にいる人の名簿」）で共有する
-- ・オフラインの人 …… 最近アクセスした人を、最終オンライン時刻つきで薄暗く表示する
-- ・クエスト名を見せたくない人は、設定で隠せる

-- 1) クエスト名を隠す設定
alter table public.profiles
  add column hide_quest_title boolean not null default false;
grant update (hide_quest_title) on public.profiles to authenticated;


-- 2) 最近アクセスしたほかのユーザー（名前と最終オンライン時刻だけ）を返す
--    profiles は RLS で自分の行しか読めないので、必要な項目だけを返す関数を用意する
create or replace function public.get_recent_campers(p_limit integer default 15)
returns table (id uuid, name text, last_active_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.last_active_at
    from public.profiles p
   where p.id <> auth.uid()
     and p.last_active_at > now() - interval '7 days'
   order by p.last_active_at desc
   limit least(greatest(p_limit, 0), 30);
$$;

revoke execute on function public.get_recent_campers(integer) from public, anon;
grant execute on function public.get_recent_campers(integer) to authenticated;


-- 3) Realtime の「campfire」チャンネルで、ログインした人だけが Presence を使えるようにする
--    （private チャンネルにして、RLS で許可する。Supabase の推奨のやり方）
create policy "焚き火の名簿を見られる"
  on realtime.messages for select to authenticated
  using (realtime.topic() = 'campfire' and extension = 'presence');

create policy "焚き火の名簿に自分を載せられる"
  on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'campfire' and extension = 'presence');
