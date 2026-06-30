import { describe, expect, it } from 'vitest';

import { createWikipediaMatchEventProvider, parseWikipediaGroupArticle } from '@/lib/ingest/wikipedia';

// R32 記事の RSA vs CAN 断片（実記事から抜粋）
const RSA_CAN_BOX = `
{{#invoke:Football box|main
|date={{Start date|2026|6|28}}
|team1={{#invoke:flag|fb-rt|RSA}}
|score={{score link|2026 FIFA World Cup round of 32#South Africa vs Canada|0–1}}
|team2={{#invoke:flag|fb|CAN}}
|goals1=
|goals2=
*[[Stephen Eustáquio|Eustáquio]] 90+2'
}}
`;

// BRA vs JPN（2-1 想定）
const BRA_JPN_BOX = `
{{#invoke:Football box|main
|team1={{#invoke:flag|fb|BRA}}
|score={{score link|2026 FIFA World Cup round of 32#Brazil vs Japan|2–1}}
|team2={{#invoke:flag|fb-rt|JPN}}
|goals1=
*[[Vinícius Júnior|Vinícius Jr.]] 23'
*[[Rodrygo]] 67'
|goals2=
*[[Kaoru Mitoma|Mitoma]] 45+1'
}}
`;

// 未終了試合（score なし）
const UNFINISHED_BOX = `
{{#invoke:Football box|main
|team1={{#invoke:flag|fb|GER}}
|score={{score link|2026 FIFA World Cup round of 32#Germany vs Paraguay|Match 75}}
|team2={{#invoke:flag|fb|PAR}}
|goals1=
|goals2=
}}
`;

const R32_WIKITEXT = RSA_CAN_BOX + BRA_JPN_BOX + UNFINISHED_BOX;

describe('parseWikipediaGroupArticle — KO 記事にも適用できる', () => {
  it('R32 形式の wikitext から試合リストを返す', () => {
    const matches = parseWikipediaGroupArticle(R32_WIKITEXT);
    expect(matches).toHaveLength(3);
  });

  it('RSA vs CAN: score=0–1、得点者=CAN Eustáquio', () => {
    const matches = parseWikipediaGroupArticle(R32_WIKITEXT);
    const m = matches.find((x) => x.team1Code === 'RSA' && x.team2Code === 'CAN');
    expect(m).toBeTruthy();
    expect(m!.score).toEqual({ team1: 0, team2: 1 });
    expect(m!.events).toHaveLength(1);
    expect(m!.events[0]).toMatchObject({
      type: 'goal',
      teamCode: 'CAN',
      playerName: 'Stephen Eustáquio',
      minute: 90,
    });
  });

  it('BRA vs JPN: score=2–1、得点者3人', () => {
    const matches = parseWikipediaGroupArticle(R32_WIKITEXT);
    const m = matches.find((x) => x.team1Code === 'BRA');
    expect(m!.score).toEqual({ team1: 2, team2: 1 });
    expect(m!.events).toHaveLength(3);
  });

  it('スコアなし試合は score=null', () => {
    const matches = parseWikipediaGroupArticle(R32_WIKITEXT);
    const m = matches.find((x) => x.team1Code === 'GER');
    expect(m!.score).toBeNull();
  });
});

describe('createWikipediaMatchEventProvider — 決勝T対応', () => {
  function makeProvider(wikitextMap: Record<string, string>) {
    return createWikipediaMatchEventProvider({
      fetchWikitext: async (title) => wikitextMap[title] ?? null,
    });
  }

  it('fetchMatchEvents: round_of_32 の試合でイベントを返す', async () => {
    const provider = makeProvider({
      '2026 FIFA World Cup round of 32': R32_WIKITEXT,
    });
    const events = await provider.fetchMatchEvents({
      externalEventId: '',
      stage: 'round_of_32',
      homeCode: 'RSA',
      awayCode: 'CAN',
      groupLetter: null,
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      playerName: 'Stephen Eustáquio',
      isHome: false,
    });
  });

  it('fetchMatchEvents: home/away 逆でも正しく isHome を判定', async () => {
    const provider = makeProvider({
      '2026 FIFA World Cup round of 32': R32_WIKITEXT,
    });
    const events = await provider.fetchMatchEvents({
      externalEventId: '',
      stage: 'round_of_32',
      homeCode: 'CAN',
      awayCode: 'RSA',
      groupLetter: null,
    });
    expect(events).toHaveLength(1);
    expect(events[0].isHome).toBe(true);
  });

  it('fetchMatchEvents: 未終了試合はイベント空', async () => {
    const provider = makeProvider({
      '2026 FIFA World Cup round of 32': R32_WIKITEXT,
    });
    const events = await provider.fetchMatchEvents({
      externalEventId: '',
      stage: 'round_of_32',
      homeCode: 'GER',
      awayCode: 'PAR',
      groupLetter: null,
    });
    expect(events).toHaveLength(0);
  });

  it('fetchMatchEvents: group_stage は従来どおり動作', async () => {
    const GL_WIKITEXT = `
{{#invoke:Football box|main
|team1={{#invoke:flag|fb|JPN}}
|score={{score link|2026 FIFA World Cup Group C#Japan vs Croatia|2–0}}
|team2={{#invoke:flag|fb|CRO}}
|goals1=
*[[Kaoru Mitoma|Mitoma]] 34'
*[[Junya Ito|Ito]] 78'
|goals2=
}}
`;
    const provider = makeProvider({
      '2026 FIFA World Cup Group C': GL_WIKITEXT,
    });
    const events = await provider.fetchMatchEvents({
      externalEventId: '',
      stage: 'group_stage',
      homeCode: 'JPN',
      awayCode: 'CRO',
      groupLetter: 'C',
    });
    expect(events).toHaveLength(2);
  });

  it('fetchFallbackResults: round_of_32 の完了試合を結果として返す', async () => {
    const provider = makeProvider({
      '2026 FIFA World Cup round of 32': R32_WIKITEXT,
    });
    const results = await provider.fetchFallbackResults([
      { stage: 'round_of_32', homeCode: 'RSA', awayCode: 'CAN', matchDate: '2026-06-28', groupLetter: null },
      { stage: 'round_of_32', homeCode: 'GER', awayCode: 'PAR', matchDate: '2026-06-28', groupLetter: null },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      homeName: 'RSA',
      awayName: 'CAN',
      homeScore: 0,
      awayScore: 1,
      finished: true,
    });
  });

  it('fetchResults: GL + 決勝T の完了試合を両方返す', async () => {
    const GL_WIKITEXT = `
{{#invoke:Football box|main
|team1={{#invoke:flag|fb|JPN}}
|score={{score link|test|1–0}}
|team2={{#invoke:flag|fb|CRO}}
}}
`;
    const provider = makeProvider({
      '2026 FIFA World Cup Group C': GL_WIKITEXT,
      '2026 FIFA World Cup round of 32': RSA_CAN_BOX + UNFINISHED_BOX,
    });
    const results = await provider.fetchResults();
    const sources = results.map((r) => `${r.homeName}-${r.awayName}`);
    expect(sources).toContain('JPN-CRO');
    expect(sources).toContain('RSA-CAN');
    // 未終了は含まない
    expect(sources).not.toContain('GER-PAR');
  });

  it('未知ステージは空を返す（エラーにならない）', async () => {
    const provider = makeProvider({});
    const events = await provider.fetchMatchEvents({
      externalEventId: '',
      stage: 'third_place',
      homeCode: 'FRA',
      awayCode: 'ESP',
      groupLetter: null,
    });
    expect(events).toHaveLength(0);
  });
});
