import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

import { getDb } from '../src/db/client';

const root = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(root, '../src/db/migrations');

async function ensureMigrationsTable() {
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
}

async function tableExists(name: string): Promise<boolean> {
  const result = await getDb().execute({
    sql: `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`,
    args: [name],
  });
  return result.rows.length > 0;
}

async function getExecutedNames(): Promise<Set<string>> {
  const result = await getDb().execute('SELECT name FROM _migrations');
  return new Set(result.rows.map((row) => (row as unknown as { name: string }).name));
}

async function recordMigration(name: string) {
  await getDb().execute({
    sql: 'INSERT INTO _migrations (name) VALUES (?)',
    args: [name],
  });
}

async function migrate() {
  await ensureMigrationsTable();

  const executed = await getExecutedNames();

  // 既存DB保護: _migrations が空でも、コアテーブルが既に存在する場合は
  // 0001_initial を実行済みとして記録する（CREATE TABLE IF NOT EXISTS でも
  // 安全に再実行できるが、運用ログの整合性のため明示的にスキップ扱いにする）。
  if (executed.size === 0) {
    const core = ['teams', 'venues', 'matches', 'bracket_edges'];
    const present = await Promise.all(core.map((t) => tableExists(t)));
    if (present.every(Boolean)) {
      await recordMigration('0001_initial.sql');
      executed.add('0001_initial.sql');
      console.log('Detected pre-existing core tables; marked 0001_initial.sql as executed');
    }
  }

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (executed.has(file)) {
      console.log(`Skip ${file} (already executed)`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await getDb().execute(statement);
    }

    await recordMigration(file);
    console.log(`Executed ${file}`);
  }

  console.log('Migration completed');
}

migrate().catch((error: unknown) => {
  console.error('Migration failed');
  console.error(error);
  process.exitCode = 1;
});
