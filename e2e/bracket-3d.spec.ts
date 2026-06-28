/**
 * 3D ブラケットビュー E2E テスト
 *
 * 【診断済みバグ】
 *   TypeError: Cannot read properties of undefined (reading 'ReactCurrentBatchConfig')
 *   → @react-three/fiber@8.x が React 18 内部 API を使用しており
 *     React 19 環境でモジュールロード自体がクラッシュしていた。
 *   → 修正: @react-three/fiber を v8 → v9 に更新
 *
 * 実行方法:
 *   npx playwright test e2e/bracket-3d.spec.ts --project=chromium
 *   (BASE_URL 環境変数 or playwright.config.ts の baseURL を本番 URL に設定)
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';

test.describe('3D bracket view', () => {
  test('3Dボタンを押してもエラーにならない', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 決勝T ページへ（ナビリンクがあれば遷移）
    const knockoutLink = page.locator('nav').getByRole('link', { name: /決勝T/ }).first();
    if (await knockoutLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await knockoutLink.click();
      await page.waitForLoadState('networkidle');
    }

    mkdirSync('e2e/screenshots', { recursive: true });
    await page.screenshot({ path: 'e2e/screenshots/before-3d.png' });

    // 3D タブ
    const btn3d = page.locator('[role="tab"]', { hasText: '3D' }).first();
    await expect(btn3d).toBeVisible({ timeout: 10_000 });
    await btn3d.click();

    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'e2e/screenshots/after-3d.png' });

    // デバッグ用にエラーをファイルへ
    writeFileSync('e2e/errors.json', JSON.stringify({ consoleErrors, pageErrors }, null, 2));

    // 「問題が発生しました」が表示されていないこと
    await expect(page.locator('text=問題が発生しました')).not.toBeVisible({ timeout: 5_000 });

    // canvas が表示されていること
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

    // JavaScript ページエラーがないこと
    expect(pageErrors, `ページエラー:\n${pageErrors.join('\n')}`).toHaveLength(0);
  });
});
