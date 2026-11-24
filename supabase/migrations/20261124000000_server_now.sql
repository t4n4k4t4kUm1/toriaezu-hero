-- サーバーの「今の時刻」を返す関数
-- 端末の時計がずれていても、タイマーの表示をサーバーの時計に合わせるために使う。
create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$ select now() $$;

revoke execute on function public.server_now() from public, anon;
grant execute on function public.server_now() to authenticated;
