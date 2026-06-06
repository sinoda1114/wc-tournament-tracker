import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MissingEnvError, requireDbEnv } from '@/lib/env';

// process.env を各テストで退避・復元し、相互汚染を防ぐ。
let saved: { url: string | undefined; token: string | undefined };

beforeEach(() => {
  saved = {
    url: process.env.TURSO_DATABASE_URL,
    token: process.env.TURSO_AUTH_TOKEN,
  };
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
});

afterEach(() => {
  if (saved.url === undefined) delete process.env.TURSO_DATABASE_URL;
  else process.env.TURSO_DATABASE_URL = saved.url;
  if (saved.token === undefined) delete process.env.TURSO_AUTH_TOKEN;
  else process.env.TURSO_AUTH_TOKEN = saved.token;
});

describe('requireDbEnv', () => {
  it('URL 未設定なら MissingEnvError を投げ、欠落に URL を含む', () => {
    expect(() => requireDbEnv()).toThrow(MissingEnvError);
    try {
      requireDbEnv();
    } catch (e) {
      expect(e).toBeInstanceOf(MissingEnvError);
      expect((e as MissingEnvError).missing).toContain('TURSO_DATABASE_URL');
    }
  });

  it('リモート(libsql://) URL でトークン未設定なら TOKEN も欠落扱い', () => {
    process.env.TURSO_DATABASE_URL = 'libsql://example.turso.io';
    try {
      requireDbEnv();
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(MissingEnvError);
      expect((e as MissingEnvError).missing).toEqual(['TURSO_AUTH_TOKEN']);
    }
  });

  it('リモート URL + トークンあり なら両値を返す', () => {
    process.env.TURSO_DATABASE_URL = 'libsql://example.turso.io';
    process.env.TURSO_AUTH_TOKEN = 'tok_abc';
    const env = requireDbEnv();
    expect(env.databaseUrl).toBe('libsql://example.turso.io');
    expect(env.authToken).toBe('tok_abc');
  });

  it('ローカル file: URL はトークン無しでも許可される', () => {
    process.env.TURSO_DATABASE_URL = 'file:local.db';
    const env = requireDbEnv();
    expect(env.databaseUrl).toBe('file:local.db');
    expect(env.authToken).toBeUndefined();
  });

  it('http://localhost はリモート扱いせずトークン不要', () => {
    process.env.TURSO_DATABASE_URL = 'http://localhost:8080';
    const env = requireDbEnv();
    expect(env.databaseUrl).toBe('http://localhost:8080');
    expect(env.authToken).toBeUndefined();
  });

  it('前後空白はトリムされ、空白のみのトークンは未設定扱い', () => {
    process.env.TURSO_DATABASE_URL = '  file:local.db  ';
    process.env.TURSO_AUTH_TOKEN = '   ';
    const env = requireDbEnv();
    expect(env.databaseUrl).toBe('file:local.db');
    expect(env.authToken).toBeUndefined();
  });

  it('MissingEnvError のメッセージに欠落変数名と .env 案内を含む', () => {
    try {
      requireDbEnv();
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('TURSO_DATABASE_URL');
      expect(msg).toContain('.env');
    }
  });
});
