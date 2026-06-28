import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import os from 'os';

const chromiumExec = process.env.CHROMIUM_PATH || '';

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
