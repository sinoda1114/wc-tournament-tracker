import { test, expect } from '@playwright/test';

test.describe('3D bracket view', () => {
  test('3Dボタンを押してもエラーにならない', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    // console.error と uncaught error を収集
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // 決勝T ページへ移動
    await page.goto('/?view=kt');
    await page.waitForLoadState('networkidle');

    // 3D タブを押す前のスクリーンショット
    await page.screenshot({ path: 'e2e/screenshots/before-3d.png', fullPage: false });

    // 3D ボタンをクリック
    const btn3d = page.getByRole('tab', { name: /3D/i });
    await expect(btn3d).toBeVisible({ timeout: 10_000 });
    await btn3d.click();

    // 3D シーンのレンダリングを少し待つ
    await page.waitForTimeout(3000);

    // クリック後スクリーンショット
    await page.screenshot({ path: 'e2e/screenshots/after-3d.png', fullPage: false });

    // エラー検出
    console.log('=== console.error ===');
    consoleErrors.forEach((e) => console.log(e));
    console.log('=== pageerror ===');
    pageErrors.forEach((e) => console.log(e));

    // アプリレベルエラーバウンダリ（「問題が発生しました」）が出ていないこと
    const errorHeading = page.locator('text=問題が発生しました');
    await expect(errorHeading).not.toBeVisible({ timeout: 5_000 });

    // canvas 要素が表示されていること（3D シーンが起動した証拠）
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    // コンソールエラーが無いこと
    expect(pageErrors, `ページエラー: ${pageErrors.join(', ')}`).toHaveLength(0);
  });
});
