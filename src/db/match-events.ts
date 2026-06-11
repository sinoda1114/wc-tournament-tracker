import type { RankingEvent } from '@/lib/rankings';

import { getDb } from './client';

const db = () => getDb();

/** 試合イベントの種別。 */
export type MatchEventType =
  | 'goal'
  | 'own_goal'
  | 'penalty_goal'
  | 'yellow_card'
  | 'red_card'
  | 'substitution';

/** データ起源。manual は auto 再取得で上書きしない。 */
export type MatchEventSource = 'auto' | 'manual';

export type MatchEvent = {
  id: number;
  matchId: number;
  type: MatchEventType;
  /** 起きた分（NULL=不明）。 */
  minute: number | null;
  /** どちらのチームの出来事か（未確定時 null）。 */
  teamId: string | null;
  /** 主体選手（得点者 / カード対象 / 交代IN）。 */
  playerName: string;
  /** 補助選手（アシスト / 交代OUT）。 */
  playerOut: string | null;
  sortOrder: number;
  source: MatchEventSource;
  externalId: string | null;
};

type MatchEventRow = {
  id: number;
  match_id: number;
  type: MatchEventType;
  minute: number | null;
  team_id: string | null;
  player_name: string;
  player_out: string | null;
  sort_order: number;
  source: MatchEventSource;
  external_id: string | null;
};

function mapMatchEvent(row: MatchEventRow): MatchEvent {
  return {
    id: row.id,
    matchId: row.match_id,
    type: row.type,
    minute: row.minute,
    teamId: row.team_id,
    playerName: row.player_name,
    playerOut: row.player_out,
    sortOrder: row.sort_order,
    source: row.source,
    externalId: row.external_id,
  };
}

const SELECT_COLUMNS =
  'id, match_id, type, minute, team_id, player_name, player_out, sort_order, source, external_id';

/** 指定試合のイベントを時系列（分→sort_order→id・分NULLは末尾）で返す。 */
export async function getMatchEvents(matchId: number): Promise<MatchEvent[]> {
  const result = await db().execute({
    sql: `
      SELECT ${SELECT_COLUMNS}
      FROM match_events
      WHERE match_id = ?
      ORDER BY
        CASE WHEN minute IS NULL THEN 1 ELSE 0 END,
        minute ASC,
        sort_order ASC,
        id ASC
    `,
    args: [matchId],
  });
  return result.rows.map((row) => mapMatchEvent(row as unknown as MatchEventRow));
}

export type CreateMatchEventInput = {
  matchId: number;
  type: MatchEventType;
  minute: number | null;
  teamId: string | null;
  playerName: string;
  playerOut?: string | null;
  sortOrder?: number;
};

/** 管理画面からの手動イベント追加（source='manual'・external_id は NULL）。 */
export async function createMatchEvent(input: CreateMatchEventInput): Promise<void> {
  await db().execute({
    sql: `
      INSERT INTO match_events
        (match_id, type, minute, team_id, player_name, player_out, sort_order, source, external_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', NULL)
    `,
    args: [
      input.matchId,
      input.type,
      input.minute,
      input.teamId,
      input.playerName,
      input.playerOut ?? null,
      input.sortOrder ?? 0,
    ],
  });
}

export type UpdateMatchEventInput = {
  type: MatchEventType;
  minute: number | null;
  teamId: string | null;
  playerName: string;
  playerOut?: string | null;
  sortOrder?: number;
};

/** 手動イベントの更新（source='manual' のみ対象。auto は ingest 管理）。 */
export async function updateMatchEvent(id: number, input: UpdateMatchEventInput): Promise<void> {
  await db().execute({
    sql: `
      UPDATE match_events
      SET type = ?, minute = ?, team_id = ?, player_name = ?, player_out = ?, sort_order = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ? AND source = 'manual'
    `,
    args: [
      input.type,
      input.minute,
      input.teamId,
      input.playerName,
      input.playerOut ?? null,
      input.sortOrder ?? 0,
      id,
    ],
  });
}

/** 手動イベントの削除（source='manual' のみ）。 */
export async function deleteMatchEvent(id: number): Promise<void> {
  await db().execute({
    sql: `DELETE FROM match_events WHERE id = ? AND source = 'manual'`,
    args: [id],
  });
}

export type AutoMatchEventInput = Omit<CreateMatchEventInput, 'matchId'> & { externalId: string };

/**
 * 自動取得イベントの置き換え（2段構えの要）。
 * 指定試合の source='auto' を全消去→再挿入する。**source='manual' は一切触らない**ので、
 * 再取得しても手動の補正は保持される。件数が小さいため delete→insert で十分。
 */
export async function replaceAutoMatchEvents(
  matchId: number,
  events: AutoMatchEventInput[],
): Promise<void> {
  // delete→insert を単一トランザクション(batch)で原子化する。途中失敗で
  // 「autoが消えたまま」の中間状態を作らない（失敗時は次回ingestまで旧データ維持）。
  await db().batch(
    [
      {
        sql: `DELETE FROM match_events WHERE match_id = ? AND source = 'auto'`,
        args: [matchId],
      },
      ...events.map((event) => ({
        sql: `
          INSERT INTO match_events
            (match_id, type, minute, team_id, player_name, player_out, sort_order, source, external_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'auto', ?)
        `,
        args: [
          matchId,
          event.type,
          event.minute,
          event.teamId,
          event.playerName,
          event.playerOut ?? null,
          event.sortOrder ?? 0,
          event.externalId,
        ],
      })),
    ],
    'write',
  );
}

/**
 * ランキング集計用に、得点・カードのイベントを所属チーム情報つきで取得する（T-40）。
 * 集計（選手別の合算・並べ替え）は純関数 `lib/rankings` 側で行う。
 * 交代・オウンゴールは取得対象外（得点者/カード集計に不要）。
 */
export async function getRankingEvents(): Promise<RankingEvent[]> {
  const result = await db().execute(`
    SELECT e.type AS type,
           e.player_name AS player_name,
           e.team_id AS team_id,
           e.match_id AS match_id,
           m.match_date AS match_date,
           m.stage AS stage,
           t.fifa_code AS fifa_code,
           t.name_en AS name_en,
           t.name_ja AS name_ja
    FROM match_events e
    JOIN matches m ON m.id = e.match_id
    LEFT JOIN teams t ON t.id = e.team_id
    WHERE e.type IN ('goal', 'penalty_goal', 'yellow_card', 'red_card')
  `);
  return result.rows.map((row) => {
    const r = row as unknown as {
      type: MatchEventType;
      player_name: string;
      team_id: string | null;
      match_id: number;
      match_date: string;
      stage: string;
      fifa_code: string | null;
      name_en: string | null;
      name_ja: string | null;
    };
    return {
      type: r.type,
      playerName: r.player_name,
      teamId: r.team_id ?? null,
      teamFifaCode: r.fifa_code ?? null,
      teamNameEn: r.name_en ?? null,
      teamNameJa: r.name_ja ?? null,
      matchId: Number(r.match_id),
      matchDate: r.match_date,
      stage: r.stage,
    };
  });
}
