-- 0014_crowd_votes_lifecycle.sql
-- T-43: みんなの投票ライフサイクル（開く→締切→アーカイブ）対応。
--
-- 設計判断（後方互換・冪等）:
--   crowd_votes は既に (voter_id, stage) を保持しており、ステージ別の票がそのまま残る。
--   ＝「アーカイブ（過去ラウンドの結果を消さずに履歴化）」は新しい列を足さなくても実現できる。
--   締切（open/closed/archived）の判定は DB にフラグを持たせず、サーバ側の純関数
--   （src/lib/crowd.ts の stageVotingState）で now + そのラウンドの初戦KO時刻 + 出場確定状況
--   から一意に算出する。これにより本マイグレーションはスキーマ破壊変更を一切含まない。
--
-- 本マイグレーションでは、アーカイブ／現ラウンドの「ステージ別集計」を高速化する複合インデックス
-- のみを冪等に追加する（既存データ・既存挙動に影響なし）。

-- ステージ単位の集計（aggregateVotesByStage 相当の SELECT ... WHERE stage = ?）を効率化。
CREATE INDEX IF NOT EXISTS idx_crowd_votes_stage_team
  ON crowd_votes(stage, team_id);
