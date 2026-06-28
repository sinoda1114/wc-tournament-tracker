import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import os from 'os';

const chromiumExec = path.join(
  os.homedir(),
  'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'https://matchfav.com',
    headless: true,
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath: chromiumExec },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: chromiumExec } } },
  ],
});
