-- 仕様変更：ゴールドと薪をいったんなくす（使い道が決まっていないため）
-- 宝箱の中身は、のちに「アイテム（ホームのデコレーション等）」にする予定。
-- それまでは、宝箱のランクで XP の上乗せだけが変わる。
--
-- 【報酬のルール（暫定値）】
--   1分未満 …… 報酬なし（記録は残す）
--   基本報酬 …… 1分以上挑戦したら XP +20
--   宝箱 ……… 木（1〜29分）+0、銀（30〜59分）+5、金（60分〜）+10 を XP に上乗せ
--   正直申告 …… 自動帰還で記録より短く申告したかを記録だけしておく（ボーナスはアイテム導入時に検討）

-- 1) 報酬の関数をゴールド・薪なしで作り直す
--    （戻り値の形が変わるので、いったん消してから作る）
drop function if exists public.claim_reward(uuid, text, integer);

create function public.claim_reward(
  p_session_id   uuid,
  p_memo         text default null,
  p_declared_sec integer default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_s       public.quest_sessions;
  v_memo    text := nullif(btrim(coalesce(p_memo, '')), '');
  v_sec     integer;
  v_chest   text;
  v_xp      integer;
  v_honest  boolean := false;
  v_profile public.profiles;
begin
  select * into v_s
    from public.quest_sessions
   where id = p_session_id and user_id = v_uid
     and ended_at is not null and claimed_at is null
   for update;
  if not found then raise exception '受け取れる報酬が見つかりません'; end if;

  v_sec := coalesce(v_s.recorded_duration_sec, 0);

  -- 1分未満：報酬なしで閉じる
  if v_sec < 60 then
    update public.quest_sessions
       set declared_duration_sec = v_sec, memo_log = v_memo,
           reward_rarity = 'none', earned_xp = 0, claimed_at = now()
     where id = p_session_id;
    select * into v_profile from public.profiles where id = v_uid;
    return json_build_object(
      'earned_xp', 0, 'chest', 'none', 'honest', false,
      'declared_sec', v_sec, 'xp', v_profile.xp);
  end if;

  -- 1行日誌は必須
  if v_memo is null or char_length(v_memo) > 50 then
    raise exception '1行冒険日誌を1〜50文字で書いてください';
  end if;

  -- 自動帰還のときだけ、自己申告で作業時間を短くできる（1分〜記録時間の範囲）
  if v_s.is_auto_returned and p_declared_sec is not null then
    v_sec := greatest(60, least(p_declared_sec, v_sec));
    v_honest := v_sec < v_s.recorded_duration_sec;
  end if;

  -- 宝箱（作業時間で決まる）
  if v_sec >= 3600 then v_chest := 'gold'; v_xp := 30;
  elsif v_sec >= 1800 then v_chest := 'silver'; v_xp := 25;
  else v_chest := 'wood'; v_xp := 20;
  end if;

  -- reward_rarity には宝箱のランクを記録する
  update public.quest_sessions
     set declared_duration_sec = v_sec, memo_log = v_memo, reward_rarity = v_chest,
         earned_xp = v_xp, claimed_at = now()
   where id = p_session_id;

  update public.quests
     set total_duration_sec = total_duration_sec + v_sec
   where id = v_s.quest_id;

  update public.profiles
     set xp = xp + v_xp, last_active_at = now()
   where id = v_uid
  returning * into v_profile;

  return json_build_object(
    'earned_xp', v_xp, 'chest', v_chest, 'honest', v_honest,
    'declared_sec', v_sec, 'xp', v_profile.xp);
end;
$$;

revoke execute on function public.claim_reward(uuid, text, integer) from public, anon;
grant execute on function public.claim_reward(uuid, text, integer) to authenticated;

-- 2) 使わなくなった列を消す（必要になったら、また足せばよい）
alter table public.profiles drop column if exists gold;
alter table public.profiles drop column if exists firewood;
alter table public.quest_sessions drop column if exists earned_gold;
