import { describe, expect, it } from 'vitest';

import { koArticleTitle } from '@/lib/lineup/wikipedia-lineup';

/**
 * KO ステージの Wikipedia 記事タイトルマッピング回帰テスト。
 *
 * R16 以降は "knockout stage" 単一記事に収録されており（2026-07-06 実測）、
 * 専用記事（"round of 16" 等）は存在しない。
 * 誤ったタイトルを返すと fetchMatchLineup が 404 で null を返し
 * 先発XIが表示されなくなる（CAN vs MAR R16 で発生した欠落の再発防止）。
 */
describe('koArticleTitle', () => {
  it('round_of_32 は専用記事タイトルを返す', () => {
    expect(koArticleTitle('round_of_32')).toBe('2026 FIFA World Cup round of 32');
  });

  it('round_of_16 は knockout stage 記事タイトルを返す（専用記事なし）', () => {
    expect(koArticleTitle('round_of_16')).toBe('2026 FIFA World Cup knockout stage');
  });

  it('quarter_final は knockout stage 記事タイトルを返す', () => {
    expect(koArticleTitle('quarter_final')).toBe('2026 FIFA World Cup knockout stage');
  });

  it('semi_final は knockout stage 記事タイトルを返す', () => {
    expect(koArticleTitle('semi_final')).toBe('2026 FIFA World Cup knockout stage');
  });

  it('third_place は knockout stage 記事タイトルを返す', () => {
    expect(koArticleTitle('third_place')).toBe('2026 FIFA World Cup knockout stage');
  });

  it('final は knockout stage 記事タイトルを返す', () => {
    expect(koArticleTitle('final')).toBe('2026 FIFA World Cup knockout stage');
  });

  it('未知ステージは null を返す', () => {
    expect(koArticleTitle('group_stage')).toBeNull();
    expect(koArticleTitle('')).toBeNull();
    expect(koArticleTitle('unknown')).toBeNull();
  });
});
