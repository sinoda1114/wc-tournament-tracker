-- T-46: 決勝Tブラケット R32 の「前倒し再充填」を是正する。
--
-- 問題: 0012 で R32(stage='round_of_32') を一度 NULL（スロット表示）へ戻したが、
-- 毎時の ingest cron（resolveAndPersistRoundOf32 → resolveRoundOf32Assignments）に
-- 「グループステージ確定」ゲートが無く、グループ未消化でも calculateGroupStandings が
-- 同点 0-0-0 のチームへ position 1..4 を機械的に振るため、暫定首位/2位を R32 入口へ
-- 前倒し bind してしまった。結果、本番 R32 が確定前から実チーム ID を保持し、
-- 投票ライフサイクル（T-43）が round_of_32 を前倒しオープンしていた。
--
-- 恒久対策: src/lib/round-of-32.ts に isGroupStageComplete ゲートを追加済み
-- （全12組消化まで一切 bind しない）。本 migration は既に充填された本番 R32 を
-- スロット表示状態へ戻す「データ是正」。コード側のゲートとセットで適用すること
-- （ゲート無しだと次 cron で再充填される）。
--
-- 安全性 / 冪等性:
--  - 「グループステージがまだ確定していない」場合のみリセットする。判定は
--    『group_stage の試合に finished でないものが1件でもある』= 全72試合が
--    finished になる前。全グループ消化後（決勝T運用フェーズ）は本 UPDATE は
--    no-op になり、cron が解決した正規の R32 を壊さない。
--  - 既に NULL なら UPDATE しても値は変わらず害が無い（再適用安全）。
--  - グループ試合・R16 以降（bracket_edges 伝播）は対象外。

-- グループステージ未確定の間だけ、R32 入口の前倒し充填を解除する。
UPDATE matches
SET
  home_team_id = NULL,
  away_team_id = NULL,
  winner_team_id = NULL,
  home_score = NULL,
  away_score = NULL,
  status = 'scheduled',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE stage = 'round_of_32'
  AND EXISTS (
    SELECT 1 FROM matches g
    WHERE g.stage = 'group_stage'
      AND g.status <> 'finished'
  );
