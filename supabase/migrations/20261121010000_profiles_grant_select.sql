-- ステップ2の修正：profiles を読むための権限（SELECT）を付ける。
--
-- 2026年5月以降に作った Supabase プロジェクトでは、新しいテーブルに
-- 自動で権限が付かなくなった（changelog #45329）。
-- そのため、画面側（authenticated ロール）から使う操作は、すべて明示的に GRANT する必要がある。
-- どの行が読めるかは、これまでどおり RLS（自分の行だけ）で絞られる。
grant select on public.profiles to authenticated;
