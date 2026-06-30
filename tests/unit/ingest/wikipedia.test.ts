import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  createWikipediaMatchEventProvider,
  parseWikipediaGroupArticle,
  wikiMatchToResult,
  withWikipediaEvents,
  withWikipediaPrimaryResults,
  type WikiMatch,
  type WikiMatchEvent,
} from '@/lib/ingest/wikipedia';
import type {
  MatchEventContext,
  MatchEventProvider,
  NormalizedMatchEvent,
  NormalizedResult,
  ResultProvider,
} from '@/lib/ingest/types';

/** "2026 FIFA World Cup Group A" だけ実 fixture を返し、他組は null（テスト用）。 */
const onlyGroupA = async (title: string): Promise<string | null> =>
  title.endsWith('Group A') ? GROUP_A_WIKITEXT : null;

const GROUP_A_WIKITEXT = readFileSync(
  fileURLToPath(new URL('../../fixtures/wikipedia/group-a.wikitext', import.meta.url)),
  'utf8',
);

/** Group A 記事から Mexico(MEX) vs South Africa(RSA) の試合を取り出すヘルパー。 */
function mexRsa(): WikiMatch {
  const matches = parseWikipediaGroupArticle(GROUP_A_WIKITEXT);
  const m = matches.find((x) => x.team1Code === 'MEX' && x.team2Code === 'RSA');
  if (!m) throw new Error('MEX vs RSA match not found in fixture');
  return m;
}

function byType(events: WikiMatchEvent[], type: WikiMatchEvent['type']): WikiMatchEvent[] {
  return events.filter((e) => e.type === type);
}

describe('parseWikipediaGroupArticle（実 wikitext: 2026 FIFA World Cup Group A）', () => {
  it('記事内の全試合（football box）を抽出する', () => {
    const matches = parseWikipediaGroupArticle(GROUP_A_WIKITEXT);
    // グループは4チーム総当たり＝6試合。
    expect(matches.length).toBe(6);
    for (const m of matches) {
      expect(m.team1Code).toMatch(/^[A-Z]{3}$/);
      expect(m.team2Code).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('得点を goals1=ホーム/goals2=アウェイ で正しく取り出す（主訴: 得点者が1人になる欠落の解消）', () => {
    const goals = byType(mexRsa().events, 'goal');
    // Quiñones 9 と Jiménez 67 の2得点。両方ホーム(MEX)。
    expect(goals.map((g) => ({ player: g.playerName, minute: g.minute, team: g.teamCode }))).toEqual([
      { player: 'Julián Quiñones', minute: 9, team: 'MEX' },
      { player: 'Raúl Jiménez', minute: 67, team: 'MEX' },
    ]);
  });

  it('イエローカードをラインナップ表から取り出す（選手・分・チーム）', () => {
    const yellows = byType(mexRsa().events, 'yellow_card');
    const set = yellows.map((y) => `${y.teamCode}:${y.playerName}:${y.minute}`).sort();
    expect(set).toEqual(
      ['MEX:Brian Gutiérrez:23', 'RSA:Nkosinathi Sibisi:74', 'RSA:Teboho Mokoena:17'].sort(),
    );
  });

  it('レッドカード（sent off の退場分）をラインナップ表から取り出す', () => {
    const reds = byType(mexRsa().events, 'red_card');
    const set = reds.map((r) => `${r.teamCode}:${r.playerName}:${r.minute}`).sort();
    // Montes 90+2→90、Sithole 49、Zwane 84。
    expect(set).toEqual(
      ['MEX:César Montes:90', 'RSA:Sphephelo Sithole:49', 'RSA:Themba Zwane:84'].sort(),
    );
  });

  it('交代を IN↔OUT のペアで取り出す（各イベントに IN 選手が入る）', () => {
    const subs = byType(mexRsa().events, 'substitution');
    // MEX 5件 + RSA 4件 = 9件。
    expect(subs.length).toBe(9);
    for (const s of subs) {
      expect(s.playerName).toBeTruthy(); // IN 選手は必須
    }
    // 代表例: 79分 Vega(IN) ↔ Quiñones(OUT)。
    const at79 = subs.find((s) => s.minute === 79 && s.teamCode === 'MEX');
    expect(at79).toMatchObject({ playerName: 'Alexis Vega', playerOut: 'Julián Quiñones' });
  });

  it('イベントは分の昇順（不明=末尾）に並ぶ', () => {
    const minutes = mexRsa().events.map((e) => e.minute ?? Number.POSITIVE_INFINITY);
    const sorted = [...minutes].sort((a, b) => a - b);
    expect(minutes).toEqual(sorted);
  });

  it('score link から確定スコアを取り出す（T-82③・実施済みは N–N）', () => {
    // MEX 2–0 RSA。score link の末尾セグメント "2–0" を採用する。
    expect(mexRsa().score).toEqual({ team1: 2, team2: 0 });
  });

  it('未実施（score が "Match N" 等で N–N を持たない）試合は score=null', () => {
    const matches = parseWikipediaGroupArticle(GROUP_A_WIKITEXT);
    // フィクスチャには未実施扱い（score link 表示が "Match 28" 等）の試合が含まれる。
    const unplayed = matches.filter((m) => m.score === null);
    expect(unplayed.length).toBeGreaterThan(0);
  });
});

describe('wikiMatchToResult（T-82③・WikiMatch → NormalizedResult）', () => {
  const played: WikiMatch = {
    team1Code: 'MEX',
    team2Code: 'RSA',
    score: { team1: 2, team2: 0 },
    penaltyScore: null,
    events: [],
  };

  it('記事の向き(team1=home)に一致すればスコアをそのまま割り当てる', () => {
    const r = wikiMatchToResult(played, {
      homeCode: 'MEX',
      awayCode: 'RSA',
      matchDate: '2026-06-11',
    });
    expect(r).toEqual({
      dateEvent: '2026-06-11',
      homeName: 'MEX',
      awayName: 'RSA',
      homeScore: 2,
      awayScore: 0,
      finished: true,
      externalEventId: null,
    });
  });

  it('我々の home/away が記事と逆向きならスコアを入れ替える', () => {
    const r = wikiMatchToResult(played, {
      homeCode: 'RSA',
      awayCode: 'MEX',
      matchDate: '2026-06-11',
    });
    expect(r).toMatchObject({ homeName: 'RSA', awayName: 'MEX', homeScore: 0, awayScore: 2 });
  });

  it('score が無ければ null（未確定を誤って finished にしない）', () => {
    const r = wikiMatchToResult({ ...played, score: null }, {
      homeCode: 'MEX',
      awayCode: 'RSA',
      matchDate: '2026-06-11',
    });
    expect(r).toBeNull();
  });

  it('対戦カードが一致しなければ null', () => {
    const r = wikiMatchToResult(played, {
      homeCode: 'BRA',
      awayCode: 'ARG',
      matchDate: '2026-06-11',
    });
    expect(r).toBeNull();
  });
});

describe('parseWikipediaGroupArticle（得点欄の注記・複数分の合成ケース）', () => {
  // football box の goals1/goals2 の表記ゆれ（複数分・PK・OG・45+2）を最小 wikitext で検証。
  const synthetic = [
    '{{#invoke:football box|main',
    '|team1={{#invoke:flag|fb-rt|ENG}}',
    '|team2={{#invoke:flag|fb|FRA}}',
    '|goals1=',
    '*[[Harry Kane|Kane]] 12, 45+2 (pen.)',
    '*[[Bukayo Saka|Saka]] 78',
    '|goals2=',
    "*[[Own Player|Defender]] 30 ([[Own goal|o.g.]])",
    '}}',
  ].join('\n');

  it('1選手・複数分・PK・アディショナルタイム(45+2→45)・OG を種別判定する', () => {
    const matches = parseWikipediaGroupArticle(synthetic);
    expect(matches.length).toBe(1);
    const ev = matches[0].events;
    expect(ev).toEqual([
      { type: 'goal', minute: 12, teamCode: 'ENG', playerName: 'Harry Kane', playerOut: null },
      { type: 'own_goal', minute: 30, teamCode: 'FRA', playerName: 'Own Player', playerOut: null },
      {
        type: 'penalty_goal',
        minute: 45,
        teamCode: 'ENG',
        playerName: 'Harry Kane',
        playerOut: null,
      },
      { type: 'goal', minute: 78, teamCode: 'ENG', playerName: 'Bukayo Saka', playerOut: null },
    ]);
  });
});

describe('parseWikipediaGroupArticle（先頭 * を省いた単独得点行: T-76 回帰）', () => {
  // 真因: 得点が1件のとき編集者が箇条書き記号 * を省くことがあり、`*` 必須の旧パーサが
  // その行を丸ごと捨てて得点者を取りこぼした（例: 韓国 2-1 チェコ の Krejčí 59'）。
  // 実記事に倣い、分の後ろにアポストロフィ（59'）が付く揺れも含めて再現する。
  const korCze = [
    '{{#invoke:football box|main',
    '|team1={{#invoke:flag|fb-rt|KOR}}',
    '|team2={{#invoke:flag|fb|CZE}}',
    '|goals1=',
    "*[[Hwang In-beom]] 36'",
    "*[[Son Heung-min]] 67'",
    '|goals2=',
    // ★ 先頭 * 無し・分末アポストロフィ付きの単独得点行（取りこぼしの再現）。
    "[[Ladislav Krejčí (footballer, born 1999)|Krejčí]] 59'",
    '}}',
  ].join('\n');

  it('先頭 * の無い単独得点行からも得点者を抽出する（CZE: Krejčí 59）', () => {
    const matches = parseWikipediaGroupArticle(korCze);
    expect(matches.length).toBe(1);
    const goals = byType(matches[0].events, 'goal');
    expect(goals.map((g) => ({ player: g.playerName, minute: g.minute, team: g.teamCode }))).toEqual(
      [
        { player: 'Hwang In-beom', minute: 36, team: 'KOR' },
        { player: 'Ladislav Krejčí', minute: 59, team: 'CZE' },
        { player: 'Son Heung-min', minute: 67, team: 'KOR' },
      ],
    );
  });

  it('リンクのみ・分の無い行は得点として拾わない（over-capture 防止）', () => {
    // goals2 にリンクはあるが分（\d+'）を持たない注釈行を混ぜる。これは得点ではない。
    const withNoise = [
      '{{#invoke:football box|main',
      '|team1={{#invoke:flag|fb-rt|KOR}}',
      '|team2={{#invoke:flag|fb|CZE}}',
      '|goals1=',
      "[[Hwang In-beom]] 36'",
      '|goals2=',
      // 分を持たない（リンクだけの）行 → 得点として拾わない。
      '[[Ladislav Krejčí (footballer, born 1999)|Krejčí]]',
      '}}',
    ].join('\n');
    const matches = parseWikipediaGroupArticle(withNoise);
    const goals = byType(matches[0].events, 'goal');
    expect(goals.map((g) => `${g.teamCode}:${g.playerName}:${g.minute}`)).toEqual([
      'KOR:Hwang In-beom:36',
    ]);
  });
});

describe('createWikipediaMatchEventProvider', () => {
  const baseContext: MatchEventContext = {
    externalEventId: '100',
    stage: 'group_stage',
    groupLetter: 'A',
    homeCode: 'MEX',
    awayCode: 'RSA',
  };
  const provider = () =>
    createWikipediaMatchEventProvider({ fetchWikitext: async () => GROUP_A_WIKITEXT });

  it('該当試合のイベントを isHome 付き NormalizedMatchEvent で返す', async () => {
    const events = await provider().fetchMatchEvents(baseContext);
    expect(events.length).toBeGreaterThan(0);
    // 得点者は2人とも MEX=ホーム → isHome=true。
    const goals = events.filter((e) => e.type === 'goal');
    expect(goals.every((g) => g.isHome === true)).toBe(true);
    // RSA のカードは isHome=false。
    const rsaYellow = events.find((e) => e.type === 'yellow_card' && e.isHome === false);
    expect(rsaYellow).toBeTruthy();
    // externalId は試合内一意の wp-<index>。
    expect(new Set(events.map((e) => e.externalId)).size).toBe(events.length);
  });

  it('我々の home/away が記事と逆向きでも isHome を正しく解決する', async () => {
    const reversed = await provider().fetchMatchEvents({
      ...baseContext,
      homeCode: 'RSA',
      awayCode: 'MEX',
    });
    // 視点が逆 → MEX の得点は isHome=false。
    const goals = reversed.filter((e) => e.type === 'goal');
    expect(goals.every((g) => g.isHome === false)).toBe(true);
  });

  it('決勝T記事が取得できない場合は空を返す', async () => {
    const events = await createWikipediaMatchEventProvider({
      fetchWikitext: async () => null,
    }).fetchMatchEvents({
      ...baseContext,
      stage: 'round_of_32',
      groupLetter: null,
    });
    expect(events).toEqual([]);
  });

  it('該当試合が記事に無ければ空を返す', async () => {
    const events = await provider().fetchMatchEvents({
      ...baseContext,
      homeCode: 'BRA',
      awayCode: 'ARG',
    });
    expect(events).toEqual([]);
  });

  it('同一グループの複数試合で記事フェッチは1回だけ（run 内キャッシュ）', async () => {
    let calls = 0;
    const p = createWikipediaMatchEventProvider({
      fetchWikitext: async () => {
        calls += 1;
        return GROUP_A_WIKITEXT;
      },
    });
    await p.fetchMatchEvents(baseContext);
    await p.fetchMatchEvents({ ...baseContext, homeCode: 'MEX', awayCode: 'RSA' });
    expect(calls).toBe(1);
  });
});

describe('withWikipediaEvents（フォールバック合成）', () => {
  const context: MatchEventContext = {
    externalEventId: '100',
    stage: 'group_stage',
    groupLetter: 'A',
    homeCode: 'MEX',
    awayCode: 'RSA',
  };

  function baseProvider(events: NormalizedMatchEvent[]) {
    const fetchMatchEvents = async () => events;
    return {
      fetchResults: async (): Promise<NormalizedResult[]> => [],
      fetchMatchEvents,
      _spy: fetchMatchEvents,
    };
  }

  const baseEvent: NormalizedMatchEvent = {
    type: 'goal',
    minute: 10,
    isHome: true,
    playerName: 'Base',
    playerOut: null,
    externalId: 'tl-0',
  };

  it('Wikipedia が1件でも返せばそれを採用し、base は呼ばない', async () => {
    let baseCalled = false;
    const base = {
      fetchResults: async (): Promise<NormalizedResult[]> => [],
      fetchMatchEvents: async () => {
        baseCalled = true;
        return [baseEvent];
      },
    };
    const wiki = createWikipediaMatchEventProvider({ fetchWikitext: async () => GROUP_A_WIKITEXT });
    const events = await withWikipediaEvents(base, wiki).fetchMatchEvents(context);
    expect(events.some((e) => e.playerName === 'Julián Quiñones')).toBe(true);
    expect(baseCalled).toBe(false);
  });

  it('Wikipedia が空なら base のタイムラインにフォールバックする', async () => {
    const base = baseProvider([baseEvent]);
    const wiki = createWikipediaMatchEventProvider({ fetchWikitext: async () => null });
    const events = await withWikipediaEvents(base, wiki).fetchMatchEvents(context);
    expect(events).toEqual([baseEvent]);
  });

  it('Wikipedia が throw しても base にフォールバックする（取込を止めない）', async () => {
    const base = baseProvider([baseEvent]);
    const wiki = createWikipediaMatchEventProvider({
      fetchWikitext: async () => {
        throw new Error('wiki down');
      },
    });
    const events = await withWikipediaEvents(base, wiki).fetchMatchEvents(context);
    expect(events).toEqual([baseEvent]);
  });
});

describe('createWikipediaMatchEventProvider.fetchResults（主ソース用）', () => {
  it('全12組から score の入った試合を source=wikipedia・dateEvent空 で返す', async () => {
    const provider = createWikipediaMatchEventProvider({ fetchWikitext: onlyGroupA });
    const results = await provider.fetchResults();
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.finished).toBe(true);
      expect(r.source).toBe('wikipedia');
      expect(r.dateEvent).toBe('');
      expect(r.homeScore).not.toBeNull();
    }
    // fixture の MEX vs RSA（確定スコアあり）が含まれる。
    const found = results.find(
      (r) => [r.homeName, r.awayName].sort().join('-') === ['MEX', 'RSA'].sort().join('-'),
    );
    expect(found).toBeDefined();
  });

  it('1組が取得失敗(throw)でも他組を落とさない', async () => {
    const provider = createWikipediaMatchEventProvider({
      fetchWikitext: async (title) => {
        if (title.endsWith('Group B')) throw new Error('boom');
        return onlyGroupA(title);
      },
    });
    const results = await provider.fetchResults();
    expect(results.length).toBeGreaterThan(0); // Group A は取れる
  });
});

describe('withWikipediaPrimaryResults（Wikipedia主合成）', () => {
  const base: ResultProvider & MatchEventProvider = {
    fetchResults: async () => [
      {
        dateEvent: '2026-06-20',
        homeName: 'Germany',
        awayName: 'Ivory Coast',
        homeScore: 2,
        awayScore: 1,
        finished: true,
        externalEventId: '9',
      },
    ],
    fetchMatchEvents: async () => [],
  };

  it('Wikipedia と base を union し source を付与する', async () => {
    const wiki = createWikipediaMatchEventProvider({ fetchWikitext: onlyGroupA });
    const merged = await withWikipediaPrimaryResults(base, wiki).fetchResults();
    expect(merged.some((r) => r.source === 'thesportsdb' && r.homeName === 'Germany')).toBe(true);
    expect(merged.some((r) => r.source === 'wikipedia')).toBe(true);
  });

  it('Wikipedia fetchResults が落ちても base のみで継続', async () => {
    const wiki = {
      fetchResults: async (): Promise<NormalizedResult[]> => {
        throw new Error('wiki down');
      },
      fetchMatchEvents: async (): Promise<NormalizedMatchEvent[]> => [],
      fetchFallbackResults: async (): Promise<NormalizedResult[]> => [],
    };
    const merged = await withWikipediaPrimaryResults(base, wiki).fetchResults();
    expect(merged).toHaveLength(1);
    expect(merged.every((r) => r.source === 'thesportsdb')).toBe(true);
  });
});
