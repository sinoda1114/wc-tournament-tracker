import { describe, expect, it } from 'vitest';

import { isProtectedRoute } from '@/lib/protected-routes';

/**
 * 登録ウォール（T-46）のルート境界をユニットで担保する。
 * 「一覧・トップは公開 / 詳細は保護」「locale 接頭辞も保護」「OGP は公開」を網羅。
 */
describe('isProtectedRoute', () => {
  describe('公開のまま（保護しない）= 一覧・トップ・入り口', () => {
    const publicPaths = [
      '/',
      '/groups',
      '/groups/a',
      '/groups/h',
      '/teams', // チーム一覧
      '/teams/', // 末尾スラッシュ
      '/teams?sort=name', // クエリ付き
      '/matches', // 試合一覧/カレンダー
      '/matches/', // 末尾スラッシュ
      '/matches?date=2026-06-12', // クエリ付き
      '/prediction',
      '/favorites',
      '/terms',
      '/privacy',
      '/sign-in',
      '/sign-up',
    ];

    it.each(publicPaths)('%s は保護しない', (path) => {
      expect(isProtectedRoute(path)).toBe(false);
    });
  });

  describe('ログイン必須（保護する）= 詳細・深掘り', () => {
    const protectedPaths = [
      '/matches/51', // 試合詳細
      '/matches/51/', // 末尾スラッシュ
      '/matches/abc?x=1', // クエリ付き
      '/teams/jpn', // チーム詳細
      '/teams/bra/', // 末尾スラッシュ
      '/rankings', // 得点王/スタッツ
      '/rankings/', // 末尾スラッシュ
      '/rankings/scorers', // 配下も保護
    ];

    it.each(protectedPaths)('%s は保護する', (path) => {
      expect(isProtectedRoute(path)).toBe(true);
    });
  });

  describe('locale 接頭辞（en/es/pt/zh）も同じ境界で保護', () => {
    it.each([
      '/en/matches/51',
      '/es/teams/bra',
      '/pt/matches/9',
      '/zh/rankings',
      '/zh/rankings/scorers',
    ])('%s は保護する（locale 素通り穴を塞ぐ）', (path) => {
      expect(isProtectedRoute(path)).toBe(true);
    });

    it.each([
      '/en', // ロケール別トップは公開
      '/es', // 〃
      '/en/groups', // 一覧は公開
      '/es/teams', // チーム一覧は公開
      '/pt/matches', // 試合一覧は公開
      '/zh/prediction', // 予想トップは公開
    ])('%s は保護しない（一覧・トップは公開）', (path) => {
      expect(isProtectedRoute(path)).toBe(false);
    });
  });

  describe('OGP / メタ画像ルートはクローラ向けに公開', () => {
    it.each([
      '/matches/51/opengraph-image',
      '/matches/51/opengraph-image.png',
      '/matches/51/twitter-image',
      '/teams/jpn/opengraph-image',
      '/teams/jpn/opengraph-image.png',
      '/en/matches/51/opengraph-image',
    ])('%s は保護しない', (path) => {
      expect(isProtectedRoute(path)).toBe(false);
    });
  });

  describe('一覧の単数形誤マッチがないこと（境界確認）', () => {
    it('/teams は /teams/(.+) にマッチしない', () => {
      expect(isProtectedRoute('/teams')).toBe(false);
    });
    it('/matches は /matches/(.+) にマッチしない', () => {
      expect(isProtectedRoute('/matches')).toBe(false);
    });
    // 似た名前の別ルートを保護対象に取り込まないこと
    it('/matches-archive のような別名は保護しない', () => {
      expect(isProtectedRoute('/matches-archive')).toBe(false);
    });
  });
});
