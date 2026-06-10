import { z } from 'zod';

/**
 * 入力検証スキーマ（zod）。クライアント由来の値を DB / 認証手前で弾くために使う。
 * 既存の型（UpdateMatchResultInput / MatchStatus）と整合させる。
 */

/** 試合ステータス（DB の MatchStatus と一致）。 */
export const matchStatusSchema = z.enum(['scheduled', 'in_progress', 'finished']);

/** スコア: 0〜99 の整数、または null（未確定）。 */
const scoreSchema = z.number().int().min(0).max(99).nullable();

/**
 * 管理画面からの試合結果更新の入力（UpdateMatchResultInput に対応）。
 * 負値・非整数・巨大スコアや未知のステータスを DB 手前で拒否する。
 */
export const matchUpdateSchema = z.object({
  matchId: z.number().int().positive(),
  homeScore: scoreSchema,
  awayScore: scoreSchema,
  winnerTeamId: z.string().trim().min(1).max(64).nullable().optional(),
  status: matchStatusSchema,
});

export type MatchUpdateInput = z.infer<typeof matchUpdateSchema>;
