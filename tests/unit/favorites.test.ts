import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MatchDetail } from '@/db/queries';
import {
  FAVORITES_KEY,
  FILTER_KEY,
  isFavorite,
  matchHasFavorite,
  readFavorites,
  readFilterEnabled,
  toggleFavorite,
  writeFavorites,
  writeFilterEnabled,
} from '@/lib/favorites';

/**
 * Vitest は環境 `node` のまま運用するため、`window` と `localStorage` を Map ベースで
 * フェイク注入する。`vi.stubGlobal` を利用して各テストごとに状態をリセットする。
 */
class FakeStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function installFakeWindow(): { storage: FakeStorage; dispatchEvent: ReturnType<typeof vi.fn> } {
  const storage = new FakeStorage();
  const dispatchEvent = vi.fn();
  // `addEventListener` などは本ファイルのテスト範囲では使わないので最低限のスタブで OK。
  vi.stubGlobal('window', {
    localStorage: storage,
    dispatchEvent,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    CustomEvent: globalThis.CustomEvent ?? class CustomEventPolyfill {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    },
  });
  return { storage, dispatchEvent };
}

describe('favorites storage (window あり)', () => {
  let storage: FakeStorage;
  let dispatchEvent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ({ storage, dispatchEvent } = installFakeWindow());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('readFavorites は初回 [] を返す', () => {
    expect(readFavorites()).toEqual([]);
  });

  it('writeFavorites で書いた値が readFavorites で復元できる', () => {
    writeFavorites(['JPN', 'ARG', 'GER']);
    expect(readFavorites()).toEqual(['JPN', 'ARG', 'GER']);
    expect(storage.getItem(FAVORITES_KEY)).toBe('["JPN","ARG","GER"]');
  });

  it('writeFavorites は小文字や前後空白を正規化し、重複を排除する', () => {
    writeFavorites([' jpn ', 'JPN', 'arg', 'ARG']);
    expect(readFavorites()).toEqual(['JPN', 'ARG']);
  });

  it("toggleFavorite('GER') が新しい配列 ['GER'] を返す", () => {
    const next = toggleFavorite('GER');
    expect(next).toEqual(['GER']);
    expect(readFavorites()).toEqual(['GER']);
  });

  it('再度 toggleFavorite で対象が外れて [] を返す', () => {
    writeFavorites(['GER']);
    const next = toggleFavorite('ger');
    expect(next).toEqual([]);
    expect(readFavorites()).toEqual([]);
  });

  it('toggleFavorite は dispatchEvent("wc:favorites-changed") を発火する', () => {
    toggleFavorite('JPN');
    const types = dispatchEvent.mock.calls.map((c) => (c[0] as Event).type);
    expect(types).toContain('wc:favorites-changed');
  });

  it('isFavorite は大文字小文字を吸収して判定する', () => {
    const set = new Set(['JPN', 'ARG']);
    expect(isFavorite('jpn', set)).toBe(true);
    expect(isFavorite('ARG', set)).toBe(true);
    expect(isFavorite('USA', set)).toBe(false);
  });

  it('readFilterEnabled は初回 false を返す', () => {
    expect(readFilterEnabled()).toBe(false);
  });

  it('writeFilterEnabled(true) → readFilterEnabled が true を返す', () => {
    writeFilterEnabled(true);
    expect(readFilterEnabled()).toBe(true);
    expect(storage.getItem(FILTER_KEY)).toBe('1');

    writeFilterEnabled(false);
    expect(readFilterEnabled()).toBe(false);
    expect(storage.getItem(FILTER_KEY)).toBe('0');
  });

  it('壊れた JSON が保存されていても readFavorites は [] を返す（耐障害性）', () => {
    storage.setItem(FAVORITES_KEY, '{not-json');
    expect(readFavorites()).toEqual([]);
  });
});

describe('favorites storage (SSR: window 未定義)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // `vi.stubGlobal('window', undefined)` だと `typeof window` が 'undefined' になる。
    vi.stubGlobal('window', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('readFavorites は window 未定義でも空配列を返してクラッシュしない', () => {
    expect(readFavorites()).toEqual([]);
  });

  it('writeFavorites は window 未定義でも例外を投げず no-op として扱う', () => {
    expect(() => writeFavorites(['JPN'])).not.toThrow();
    expect(readFavorites()).toEqual([]);
  });

  it('readFilterEnabled は window 未定義でも false を返す', () => {
    expect(readFilterEnabled()).toBe(false);
  });
});

/** MatchDetail のうち matchHasFavorite が見るのは home/away の fifaCode だけ。 */
function fixtureMatch(homeCode: string | null, awayCode: string | null): MatchDetail {
  return {
    homeTeam: homeCode ? { fifaCode: homeCode } : null,
    awayTeam: awayCode ? { fifaCode: awayCode } : null,
  } as unknown as MatchDetail;
}

describe('matchHasFavorite（試合カードのお気に入りフィルター共用ロジック）', () => {
  it('home がお気に入りなら true', () => {
    expect(matchHasFavorite(fixtureMatch('JPN', 'BRA'), new Set(['JPN']))).toBe(true);
  });

  it('away がお気に入りなら true', () => {
    expect(matchHasFavorite(fixtureMatch('JPN', 'BRA'), new Set(['BRA']))).toBe(true);
  });

  it('home/away どちらもお気に入りでなければ false', () => {
    expect(matchHasFavorite(fixtureMatch('JPN', 'BRA'), new Set(['GER']))).toBe(false);
  });

  it('小文字 fifaCode でも大文字に正規化して判定する', () => {
    expect(matchHasFavorite(fixtureMatch('jpn', null), new Set(['JPN']))).toBe(true);
  });

  it('チーム未確定（null）でもクラッシュせず false', () => {
    expect(matchHasFavorite(fixtureMatch(null, null), new Set(['JPN']))).toBe(false);
  });

  it('お気に入りが空集合なら常に false', () => {
    expect(matchHasFavorite(fixtureMatch('JPN', 'BRA'), new Set())).toBe(false);
  });
});
