import { defineConfig, devices } from '@playwright/test';

const chromiumExec = process.env.CHROMIUM_PATH || '';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://matchfav.com',
    headless: true,
    ...devices['Desktop Chrome'],
    ...(chromiumExec ? { launchOptions: { executablePath: chromiumExec } } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumExec ? { launchOptions: { executablePath: chromiumExec } } : {}),
      },
    },
  ],
});
