import { createClient, type Client } from '@libsql/client';

import { requireDbEnv } from '@/lib/env';

let client: Client | null = null;

export function getDb(): Client {
  if (client) {
    return client;
  }

  // env 欠落時は MissingEnvError（人間可読）を投げる。
  // RSC からの呼び出しなら src/app/error.tsx / global-error.tsx が拾い、
  // 素の 500 ではなくフォールバック UI を表示する。
  const { databaseUrl, authToken } = requireDbEnv();

  client = createClient({
    url: databaseUrl,
    authToken,
  });

  return client;
}

export function setDbForTesting(testClient: Client): void {
  client = testClient;
}

export function resetDbForTesting(): void {
  client = null;
}
