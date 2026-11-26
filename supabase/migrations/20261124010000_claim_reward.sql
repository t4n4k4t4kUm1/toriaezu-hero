-- ステップ5：報酬を受け取る関数
--
-- 帰還したあと、1行日誌を書いて「宝箱を開ける！」を押すと呼ばれる。
-- 報酬の計算はすべてここで行う（画面側で計算すると、数値を書き換えられてしまうため）。
--
-- 【報酬のルール（暫定値）】
--   1分未満 …… 報酬なし（記録は残す）
--   基本報酬 …… 1分以上挑戦したら XP +20 / 10G （報酬の大部分はここで確定）
--   宝箱 ……… 作業時間で決まる。木（1〜29分）+0、銀（30〜59分）+5、金（60分〜）+10 を XP と G に上乗せ
--   ドロップ …… 運で決まる。ふつう 82% +0G、レア 15% +10G、激レア 3% +30G
--   誠実ボーナス … 自動帰還のとき、記録より短く申告したら 薪 +1（XP・G は増えない）
--
-- 画面側の表示用の値は src/config/rewards.ts にもある。数値を変えるときは両方そろえること。

create or replace function public.claim_reward(
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
  v_uid      uuid := auth.uid();
  v_s        public.quest_sessions;
  v_memo     text := nullif(btrim(coalesce(p_memo, '')), '');
  v_sec      integer;
  v_chest    text := 'none';
  v_bonus    integer := 0;
  v_rarity   text := 'none';
  v_drop     integer := 0;
  v_roll     double precision;
  v_xp       integer := 0;
  v_gold     integer := 0;
  v_honest   boolean := false;
  v_profile  public.profiles;
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
           reward_rarity = 'none', earned_xp = 0, earned_gold = 0, claimed_at = now()
     where id = p_session_id;
    select * into v_profile from public.profiles where id = v_uid;
    return json_build_object(
      'earned_xp', 0, 'earned_gold', 0, 'chest', 'none', 'rarity', 'none',
      'honest_bonus', false, 'declared_sec', v_sec,
      'xp', v_profile.xp, 'gold', v_profile.gold, 'firewood', v_profile.firewood);
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

  -- 宝箱（作業時間）
  if v_sec >= 3600 then v_chest := 'gold'; v_bonus := 10;
  elsif v_sec >= 1800 then v_chest := 'silver'; v_bonus := 5;
  else v_chest := 'wood'; v_bonus := 0;
  end if;

  -- ドロップ（運）
  v_roll := random();
  if v_roll < 0.03 then v_rarity := 'epic'; v_drop := 30;
  elsif v_roll < 0.18 then v_rarity := 'rare'; v_drop := 10;
  else v_rarity := 'normal'; v_drop := 0;
  end if;

  v_xp   := 20 + v_bonus;
  v_gold := 10 + v_bonus + v_drop;

  update public.quest_sessions
     set declared_duration_sec = v_sec, memo_log = v_memo, reward_rarity = v_rarity,
         earned_xp = v_xp, earned_gold = v_gold, claimed_at = now()
   where id = p_session_id;

  update public.quests
     set total_duration_sec = total_duration_sec + v_sec
   where id = v_s.quest_id;

  update public.profiles
     set xp = xp + v_xp,
         gold = gold + v_gold,
         firewood = firewood + case when v_honest then 1 else 0 end,
         last_active_at = now()
   where id = v_uid
  returning * into v_profile;

  return json_build_object(
    'earned_xp', v_xp, 'earned_gold', v_gold, 'chest', v_chest, 'rarity', v_rarity,
    'honest_bonus', v_honest, 'declared_sec', v_sec,
    'xp', v_profile.xp, 'gold', v_profile.gold, 'firewood', v_profile.firewood);
end;
$$;

revoke execute on function public.claim_reward(uuid, text, integer) from public, anon;
grant execute on function public.claim_reward(uuid, text, integer) to authenticated;
