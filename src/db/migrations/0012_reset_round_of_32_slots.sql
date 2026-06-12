-- T-45: 決勝Tブラケットを「確定したチームから表示」に是正する。
--
-- 問題: 初期試作時のシードで Round of 32 (id 73-88) に実チーム ID が
-- home_team_id / away_team_id へ投入された本番DBが存在する。グループステージ
-- 未消化なのに「確定済み」に見える（matchfav.com/?view=kt の R32 に
-- コートジボワール/中国/フランス等が確定前から表示される事故）。
--
-- 是正方針: 確定前は実チームを出さず「グループX 1位/2位」プレースホルダで
-- 表示する。表示基盤 (MatchVersus + formatSlotLabel) は home_team_id が NULL の
-- とき home_slot / away_slot をラベル化するため、データ側を NULL に戻せばよい。
-- グループ順位が確定すると ingest が resolveAndPersistRoundOf32() で実チームを
-- 冪等に埋め直す（自動bind）。
--
-- 安全性:
--  - 大会開幕前で R32 にはまだ試合結果が存在しないため、NULL リセットで
--    ユーザー入力データが失われる懸念はない。
--  - 冪等（既に NULL なら UPDATE は no-op）。再適用しても害が無い。
--  - home_slot / away_slot は seed-matches.ts のスロット表記と一致する値へ
--    上書きし、過去のシードでラベルが崩れている場合も是正する。
--  - グループ試合 (id 1-72) と R16 以降 (id 89-104) は対象外。R16 以降の
--    勝者伝播 (bracket_edges) は本 migration では触らない。

-- R32 入口のチーム確定・結果をリセット（確定前プレースホルダ状態へ）。
UPDATE matches
SET
  home_team_id = NULL,
  away_team_id = NULL,
  winner_team_id = NULL,
  home_score = NULL,
  away_score = NULL,
  status = 'scheduled',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE stage = 'round_of_32';

-- home_slot / away_slot をグループ枠ラベルへ是正（id 73-88・FIFA 確定済み割当）。
UPDATE matches SET home_slot = 'Group A runners-up', away_slot = 'Group B runners-up' WHERE id = 73;
UPDATE matches SET home_slot = 'Group E winners', away_slot = 'Group A/B/C/D/F third place' WHERE id = 74;
UPDATE matches SET home_slot = 'Group F winners', away_slot = 'Group C runners-up' WHERE id = 75;
UPDATE matches SET home_slot = 'Group C winners', away_slot = 'Group F runners-up' WHERE id = 76;
UPDATE matches SET home_slot = 'Group I winners', away_slot = 'Group C/D/F/G/H third place' WHERE id = 77;
UPDATE matches SET home_slot = 'Group E runners-up', away_slot = 'Group I runners-up' WHERE id = 78;
UPDATE matches SET home_slot = 'Group A winners', away_slot = 'Group C/E/F/H/I third place' WHERE id = 79;
UPDATE matches SET home_slot = 'Group L winners', away_slot = 'Group E/H/I/J/K third place' WHERE id = 80;
UPDATE matches SET home_slot = 'Group D winners', away_slot = 'Group B/E/F/I/J third place' WHERE id = 81;
UPDATE matches SET home_slot = 'Group G winners', away_slot = 'Group A/E/H/I/J third place' WHERE id = 82;
UPDATE matches SET home_slot = 'Group K runners-up', away_slot = 'Group L runners-up' WHERE id = 83;
UPDATE matches SET home_slot = 'Group H winners', away_slot = 'Group J runners-up' WHERE id = 84;
UPDATE matches SET home_slot = 'Group B winners', away_slot = 'Group E/F/G/I/J third place' WHERE id = 85;
UPDATE matches SET home_slot = 'Group J winners', away_slot = 'Group H runners-up' WHERE id = 86;
UPDATE matches SET home_slot = 'Group K winners', away_slot = 'Group D/E/I/J/L third place' WHERE id = 87;
UPDATE matches SET home_slot = 'Group D runners-up', away_slot = 'Group G runners-up' WHERE id = 88;
