import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

export function getDb(): Client {
  if (client) {
    return client;
  }

  const databaseUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!databaseUrl) {
    throw new Error('TURSO_DATABASE_URL is required');
  }

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
