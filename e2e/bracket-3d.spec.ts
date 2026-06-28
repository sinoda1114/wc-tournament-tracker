/**
 * 3D bracket view E2E test
 *
 * Run:
 *   npx playwright test e2e/bracket-3d.spec.ts --project=chromium
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

    const knockoutLink = page.locator('nav').getByRole('link', { name: /決勝T/ }).first();
    if (await knockoutLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await knockoutLink.click();
      await page.waitForLoadState('networkidle');
    }

    mkdirSync('e2e/screenshots', { recursive: true });
    await page.screenshot({ path: 'e2e/screenshots/before-3d.png' });

    const btn3d = page.locator('[role="tab"]', { hasText: '3D' }).first();
    await expect(btn3d).toBeVisible({ timeout: 10_000 });
    await btn3d.click();

    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'e2e/screenshots/after-3d.png' });

    writeFileSync('e2e/errors.json', JSON.stringify({ consoleErrors, pageErrors }, null, 2));

    await expect(page.locator('text=問題が発生しました')).not.toBeVisible({ timeout: 5_000 });

    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

    expect(pageErrors, `ページエラー:\n${pageErrors.join('\n')}`).toHaveLength(0);
  });
});
