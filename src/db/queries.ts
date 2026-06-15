import { getDb } from './client';

const db = () => getDb();

export type MatchStatus = 'scheduled' | 'in_progress' | 'finished';

export type Team = {
  id: string;
  nameJa: string;
  nameEn: string;
  fifaCode: string;
  flag: string;
  groupName: string | null;
};

/**
 * 優勝国予想で使う静的レーティングを Team に足した型。
 * `fifaRank` は現在の FIFA ランク（小さいほど強い）、`wc{年}Place` は
 * 直近3大会の最終順位（1〜32、未出場は null）。
 */
export type TeamRating = Team & {
  fifaRank: number;
  wc2014Place: number | null;
  wc2018Place: number | null;
  wc2022Place: number | null;
};

export type SquadPlayer = {
  id: string;
  name: string;
  /** 英語名（常に英語）。表示で ja 以外はこれを使う。 */
  nameEn: string;
  /** 日本語名（取得できた国のみ。無ければ null → ja でも nameEn にフォールバック）。 */
  nameJa: string | null;
  position: string | null;
  dateBorn: string | null;
  number: string | null;
  /** 在籍クラブ（#38。未取得・無所属は null）。 */
  clubName: string | null;
  clubNameJa: string | null;
  /** クラブ所属リーグ国の旗用 ISO2。 */
  clubCountryIso: string | null;
};

export type Coach = {
  name: string;
  nameEn: string;
  nameJa: string | null;
  nationality: string | null;
  nationalityIso: string | null;
  dateBorn: string | null;
};

export type TeamSquad = {
  team: Team;
  coach: Coach | null;
  players: SquadPlayer[];
};

export type VenueRoofType = 'retractable' | 'translucent' | 'open';

/** 過去の男子W杯本大会の開催歴。`final` はその年に決勝を開催したか。 */
export type VenuePastWorldCup = { year: number; final: boolean };

export type Venue = {
  id: string;
  stadiumName: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  capacity: number | null;
  roofType: VenueRoofType | null;
  elevationM: number | null;
  pastWorldCups: VenuePastWorldCup[];
};

export type Match = {
  id: number;
  stage: string;
  matchDate: string;
  kickoffAt: string | null;
  venueId: string;
  homeSlot: string;
  awaySlot: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
  status: MatchStatus;
  /** グループステージ試合のグループ識別子（A〜L）。決勝Tは null。 */
  groupLetter: string | null;
  /** T-90: 自前で書いた短いハイライト要約（無ければ null）。 */
  highlightSummary: string | null;
  /** T-90: 公式ハイライトの外部URL（無ければ null）。 */
  highlightUrl: string | null;
  /** T-90: ハイライトリンク元の表示ラベル（例「FIFA公式」。無ければ null）。 */
  highlightSourceLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchDetail = Match & {
  venue: Venue;
  homeTeam: Team | null;
  awayTeam: Team | null;
  winnerTeam: Team | null;
};

type MatchRow = {
  id: number;
  stage: string;
  match_date: string;
  kickoff_at: string | null;
  venue_id: string;
  home_slot: string;
  away_slot: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  status: MatchStatus;
  group_letter: string | null;
  highlight_summary: string | null;
  highlight_url: string | null;
  highlight_source_label: string | null;
  created_at: string;
  updated_at: string;
};

type MatchDetailRow = MatchRow & {
  venue_stadium_name: string;
  venue_city: string;
  venue_state: string;
  venue_country: string;
  venue_country_code: string;
  venue_country_flag: string;
  venue_capacity: number | null;
  venue_roof_type: VenueRoofType | null;
  venue_elevation_m: number | null;
  venue_past_world_cups: string | null;
  home_team_name_ja: string | null;
  home_team_name_en: string | null;
  home_team_fifa_code: string | null;
  home_team_flag: string | null;
  home_team_group_name: string | null;
  away_team_name_ja: string | null;
  away_team_name_en: string | null;
  away_team_fifa_code: string | null;
  away_team_flag: string | null;
  away_team_group_name: string | null;
  winner_team_name_ja: string | null;
  winner_team_name_en: string | null;
  winner_team_fifa_code: string | null;
  winner_team_flag: string | null;
  winner_team_group_name: string | null;
};

type BracketEdgeRow = {
  from_match_id: number;
  from_result: 'winner' | 'loser';
  to_match_id: number;
  to_slot: 'home' | 'away';
};

type JoinedTeamFields = {
  nameJa: string | null;
  nameEn: string | null;
  fifaCode: string | null;
  flag: string | null;
  groupName: string | null;
};

export type UpdateMatchResultInput = {
  matchId: number;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId?: string | null;
  status: MatchStatus;
};

export async function listTournamentMatches() {
  const result = await db().execute({
    sql: matchDetailSql('ORDER BY m.id ASC'),
    args: [],
  });

  return result.rows.map((row) => mapMatchDetail(rowAs<MatchDetailRow>(row)));
}

export async function getMatchDetail(matchId: number) {
  const result = await db().execute({
    sql: matchDetailSql('WHERE m.id = ?'),
    args: [matchId],
  });

  const row = result.rows[0];
  return row ? mapMatchDetail(rowAs<MatchDetailRow>(row)) : null;
}

export type VenueMatchSummary = {
  /** その会場で開催される全試合数。 */
  total: number;
  /** ステージ別の試合数（試合 id の昇順）。 */
  byStage: { stage: string; count: number }[];
};

/**
 * 指定会場が WC2026 で担当する試合をステージ別に集計する。
 * 会場情報カードの「この大会で◯試合（グループ◯・R32◯…）」表示に使う。
 */
export async function getVenueMatchSummary(
  venueId: string,
): Promise<VenueMatchSummary> {
  const result = await db().execute({
    sql: `
      SELECT stage, COUNT(*) AS count
      FROM matches
      WHERE venue_id = ?
      GROUP BY stage
      ORDER BY MIN(id)
    `,
    args: [venueId],
  });

  const byStage = result.rows.map((row) => {
    const r = rowAs<{ stage: string; count: number | bigint }>(row);
    return { stage: r.stage, count: Number(r.count) };
  });

  const total = byStage.reduce((sum, item) => sum + item.count, 0);
  return { total, byStage };
}

function parsePastWorldCups(raw: string | null): VenuePastWorldCup[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is VenuePastWorldCup =>
        Boolean(entry) &&
        typeof entry.year === 'number' &&
        typeof entry.final === 'boolean',
    );
  } catch {
    return [];
  }
}

export async function listGroupStageMatches(): Promise<MatchDetail[]> {
  const result = await db().execute({
    sql: matchDetailSql("WHERE m.stage = 'group_stage' ORDER BY m.id ASC"),
    args: [],
  });

  return result.rows.map((row) => mapMatchDetail(rowAs<MatchDetailRow>(row)));
}

export async function listGroupMatches(group: string): Promise<MatchDetail[]> {
  const result = await db().execute({
    sql: matchDetailSql(
      "WHERE m.stage = 'group_stage' AND m.group_letter = ? ORDER BY m.id ASC",
    ),
    args: [group],
  });

  return result.rows.map((row) => mapMatchDetail(rowAs<MatchDetailRow>(row)));
}

export async function listAllTeams(): Promise<Team[]> {
  // 並び順は /favorites のチーム選択コンボボックスで使う「英語名アルファベット順」に
  // 統一する。他の呼び出し箇所はないため、サーバ側で sort 済みにしておけば
  // クライアント側で再ソート不要になる。
  const result = await db().execute({
    sql: `
      SELECT id, name_ja, name_en, fifa_code, flag, group_name
      FROM teams
      ORDER BY name_en ASC
    `,
    args: [],
  });

  return result.rows.map((row) => {
    const r = rowAs<{
      id: string;
      name_ja: string;
      name_en: string;
      fifa_code: string;
      flag: string;
      group_name: string | null;
    }>(row);
    return {
      id: r.id,
      nameJa: r.name_ja,
      nameEn: r.name_en,
      fifaCode: r.fifa_code,
      flag: r.flag,
      groupName: r.group_name,
    };
  });
}

/**
 * 優勝国予想で使う、全チームの表示情報＋静的レーティングを取得する。
 * 既存の `Team` 系クエリには影響を与えず、予想機能専用に分離している。
 * `fifa_rank` 等が未投入(NULL)の場合は安全側の既定値（最下位相当ランク・未出場）に倒す。
 */
export async function listTeamRatings(): Promise<TeamRating[]> {
  const result = await db().execute({
    sql: `
      SELECT id, name_ja, name_en, fifa_code, flag, group_name,
             fifa_rank, wc_2014_place, wc_2018_place, wc_2022_place
      FROM teams
      ORDER BY name_en ASC
    `,
    args: [],
  });

  return result.rows.map((row) => {
    const r = rowAs<{
      id: string;
      name_ja: string;
      name_en: string;
      fifa_code: string;
      flag: string;
      group_name: string | null;
      fifa_rank: number | null;
      wc_2014_place: number | null;
      wc_2018_place: number | null;
      wc_2022_place: number | null;
    }>(row);
    return {
      id: r.id,
      nameJa: r.name_ja,
      nameEn: r.name_en,
      fifaCode: r.fifa_code,
      flag: r.flag,
      groupName: r.group_name,
      // 未投入チームは予想から消えないよう最下位相当（211位）に倒す。
      fifaRank: r.fifa_rank ?? 211,
      wc2014Place: r.wc_2014_place,
      wc2018Place: r.wc_2018_place,
      wc2022Place: r.wc_2022_place,
    };
  });
}

export type CrowdVoteRow = { voterId: string; stage: string; teamId: string };

export type CastVoteResult = 'ok' | 'locked';

/**
 * 「みんなの予想」の1票を保存する。`(voter_id, stage)` が既にあれば挿入されず
 * 'locked'（このステージは投票済み）を返す。
 */
export async function castCrowdVote(input: {
  voterId: string;
  stage: string;
  teamId: string;
}): Promise<CastVoteResult> {
  const result = await db().execute({
    sql: `
      INSERT INTO crowd_votes (voter_id, stage, team_id)
      VALUES (?, ?, ?)
      ON CONFLICT(voter_id, stage) DO NOTHING
    `,
    args: [input.voterId, input.stage, input.teamId],
  });
  return result.rowsAffected > 0 ? 'ok' : 'locked';
}

/** 集計用に全投票を取得する（aggregateLatestVotes に渡す想定）。 */
export async function listCrowdVotes(): Promise<CrowdVoteRow[]> {
  const result = await db().execute({
    sql: 'SELECT voter_id, stage, team_id FROM crowd_votes',
    args: [],
  });
  return result.rows.map((row) => {
    const r = rowAs<{ voter_id: string; stage: string; team_id: string }>(row);
    return { voterId: r.voter_id, stage: r.stage, teamId: r.team_id };
  });
}

/** 指定 voter の投票（ステージ→teamId）を取得する。UI 表示用。 */
export async function getMyVotes(voterId: string): Promise<Record<string, string>> {
  const result = await db().execute({
    sql: 'SELECT stage, team_id FROM crowd_votes WHERE voter_id = ?',
    args: [voterId],
  });
  const map: Record<string, string> = {};
  for (const row of result.rows) {
    const r = rowAs<{ stage: string; team_id: string }>(row);
    map[r.stage] = r.team_id;
  }
  return map;
}

/** 指定ユーザーのお気に入り FIFA コード一覧（大文字・追加順）を返す。 */
export async function getUserFavorites(userId: string): Promise<string[]> {
  const result = await db().execute({
    sql: 'SELECT fifa_code FROM user_favorites WHERE user_id = ? ORDER BY created_at ASC, fifa_code ASC',
    args: [userId],
  });
  return result.rows.map((row) => rowAs<{ fifa_code: string }>(row).fifa_code);
}

/**
 * 指定ユーザーのお気に入りを与えられた集合で完全置換する（delete→insert を batch で原子化）。
 * クライアントは常に全件を送るため add/remove の競合が起きない。コードは大文字前提。
 */
export async function setUserFavorites(userId: string, codes: readonly string[]): Promise<void> {
  const normalized = Array.from(
    new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean)),
  );
  await db().batch(
    [
      { sql: 'DELETE FROM user_favorites WHERE user_id = ?', args: [userId] },
      ...normalized.map((code) => ({
        sql: 'INSERT INTO user_favorites (user_id, fifa_code) VALUES (?, ?)',
        args: [userId, code],
      })),
    ],
    'write',
  );
}

export async function getGroupTeams(group: string): Promise<Team[]> {
  const result = await db().execute({
    sql: `
      SELECT id, name_ja, name_en, fifa_code, flag, group_name
      FROM teams
      WHERE group_name = ?
      ORDER BY id ASC
    `,
    args: [`Group ${group}`],
  });

  return result.rows.map((row) => {
    const r = rowAs<{
      id: string;
      name_ja: string;
      name_en: string;
      fifa_code: string;
      flag: string;
      group_name: string | null;
    }>(row);
    return {
      id: r.id,
      nameJa: r.name_ja,
      nameEn: r.name_en,
      fifaCode: r.fifa_code,
      flag: r.flag,
      groupName: r.group_name,
    };
  });
}

/**
 * FIFA コードからチームのスカッド（監督 + 選手）を取得する。
 *
 * - チームが存在しなければ null。
 * - 監督・選手データ未投入（小国など）の場合は coach=null / players=[] を返す。
 * - 選手の並びは取得時の sort_order（API 取得順）、同値なら名前昇順。
 *   ポジション別のグルーピングは UI 側（lib/positions）で行う。
 */
export async function getTeamSquad(fifaCode: string): Promise<TeamSquad | null> {
  const teamResult = await db().execute({
    sql: `
      SELECT id, name_ja, name_en, fifa_code, flag, group_name
      FROM teams
      WHERE fifa_code = ?
    `,
    args: [fifaCode],
  });

  const teamRow = teamResult.rows[0];
  if (!teamRow) return null;

  const tr = rowAs<{
    id: string;
    name_ja: string;
    name_en: string;
    fifa_code: string;
    flag: string;
    group_name: string | null;
  }>(teamRow);

  const team: Team = {
    id: tr.id,
    nameJa: tr.name_ja,
    nameEn: tr.name_en,
    fifaCode: tr.fifa_code,
    flag: tr.flag,
    groupName: tr.group_name,
  };

  const [coachResult, playersResult] = await Promise.all([
    db().execute({
      sql: `
        SELECT name, name_en, name_ja, nationality, nationality_iso, date_born
        FROM coaches
        WHERE team_id = ?
      `,
      args: [team.id],
    }),
    db().execute({
      sql: `
        SELECT p.id, p.name, p.name_en, p.name_ja, p.position, p.date_born, p.number,
               c.name_en AS club_name, c.name_ja AS club_name_ja, c.country_iso AS club_country_iso
        FROM players p
        LEFT JOIN clubs c ON c.id = p.club_id
        WHERE p.team_id = ?
        ORDER BY p.sort_order ASC, p.name ASC
      `,
      args: [team.id],
    }),
  ]);

  const coachRow = coachResult.rows[0];
  const coach: Coach | null = coachRow
    ? (() => {
        const c = rowAs<{
          name: string;
          name_en: string | null;
          name_ja: string | null;
          nationality: string | null;
          nationality_iso: string | null;
          date_born: string | null;
        }>(coachRow);
        return {
          name: c.name,
          nameEn: c.name_en ?? c.name,
          nameJa: c.name_ja,
          nationality: c.nationality,
          nationalityIso: c.nationality_iso,
          dateBorn: c.date_born,
        };
      })()
    : null;

  const players: SquadPlayer[] = playersResult.rows.map((row) => {
    const p = rowAs<{
      id: string;
      name: string;
      name_en: string | null;
      name_ja: string | null;
      position: string | null;
      date_born: string | null;
      number: string | null;
      club_name: string | null;
      club_name_ja: string | null;
      club_country_iso: string | null;
    }>(row);
    return {
      id: p.id,
      name: p.name,
      nameEn: p.name_en ?? p.name,
      nameJa: p.name_ja,
      position: p.position,
      dateBorn: p.date_born,
      number: p.number,
      clubName: p.club_name,
      clubNameJa: p.club_name_ja,
      clubCountryIso: p.club_country_iso,
    };
  });

  return { team, coach, players };
}

export async function updateMatchResult(input: UpdateMatchResultInput) {
  const currentMatch = await getMatch(input.matchId);

  if (!currentMatch) {
    throw new Error(`Match ${input.matchId} was not found`);
  }

  const winnerTeamId = resolveWinnerTeamId(input, currentMatch);

  // グループステージの引き分け（例: 1-1）は winner 不在が正常。
  // これを許可しないと、cron 取込が引き分け試合を確定しようとして throw し、
  // スコア/「終了」が永久に反映されない（イベントだけ入る不整合になる）。T-62。
  // 決勝T（KO）は PK 決着で勝者が要るため従来どおり winner 必須を維持する
  //（cron は reconcile 側で KO 引き分けをスキップし手入力に委ねている）。
  const isGroupStageDraw =
    currentMatch.stage === 'group_stage' &&
    input.homeScore !== null &&
    input.awayScore !== null &&
    input.homeScore === input.awayScore;

  if (input.status === 'finished' && !winnerTeamId && !isGroupStageDraw) {
    throw new Error('Finished matches require a winnerTeamId');
  }

  await db().execute({
    sql: `
      UPDATE matches
      SET
        home_score = ?,
        away_score = ?,
        winner_team_id = ?,
        status = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `,
    args: [
      input.homeScore,
      input.awayScore,
      winnerTeamId,
      input.status,
      input.matchId,
    ],
  });

  await propagateMatchResult(input.matchId, winnerTeamId);

  return getMatchDetail(input.matchId);
}

function resolveWinnerTeamId(
  input: UpdateMatchResultInput,
  match: Pick<Match, 'homeTeamId' | 'awayTeamId'>,
) {
  if (input.winnerTeamId !== undefined) {
    return input.winnerTeamId;
  }

  if (
    input.homeScore === null ||
    input.awayScore === null ||
    input.homeScore === input.awayScore
  ) {
    return null;
  }

  return input.homeScore > input.awayScore ? match.homeTeamId : match.awayTeamId;
}

async function propagateMatchResult(matchId: number, winnerTeamId: string | null) {
  const sourceMatch = await getMatch(matchId);

  if (!sourceMatch) {
    throw new Error(`Match ${matchId} was not found`);
  }

  const outgoingEdgesResult = await db().execute({
    sql: `
      SELECT from_match_id, from_result, to_match_id, to_slot
      FROM bracket_edges
      WHERE from_match_id = ?
      ORDER BY id ASC
    `,
    args: [matchId],
  });

  const loserTeamId = resolveLoserTeamId(sourceMatch, winnerTeamId);

  for (const row of outgoingEdgesResult.rows) {
    const edge = rowAs<BracketEdgeRow>(row);
    const teamId = edge.from_result === 'winner' ? winnerTeamId : loserTeamId;
    const targetColumn = edge.to_slot === 'home' ? 'home_team_id' : 'away_team_id';

    await db().execute({
      sql: `
        UPDATE matches
        SET
          ${targetColumn} = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
      `,
      args: [teamId, edge.to_match_id],
    });
  }
}

function resolveLoserTeamId(
  match: Pick<Match, 'homeTeamId' | 'awayTeamId'>,
  winnerTeamId: string | null,
) {
  if (!winnerTeamId || !match.homeTeamId || !match.awayTeamId) {
    return null;
  }

  if (winnerTeamId === match.homeTeamId) {
    return match.awayTeamId;
  }

  if (winnerTeamId === match.awayTeamId) {
    return match.homeTeamId;
  }

  return null;
}

async function getMatch(matchId: number) {
  const result = await db().execute({
    sql: `
      SELECT
        id,
        stage,
        match_date,
        kickoff_at,
        venue_id,
        home_slot,
        away_slot,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        winner_team_id,
        status,
        group_letter,
        highlight_summary,
        highlight_url,
        highlight_source_label,
        created_at,
        updated_at
      FROM matches
      WHERE id = ?
    `,
    args: [matchId],
  });

  const row = result.rows[0];
  return row ? mapMatch(rowAs<MatchRow>(row)) : null;
}

function matchDetailSql(suffix: string) {
  return `
    SELECT
      m.id,
      m.stage,
      m.match_date,
      m.kickoff_at,
      m.venue_id,
      m.home_slot,
      m.away_slot,
      m.home_team_id,
      m.away_team_id,
      m.home_score,
      m.away_score,
      m.winner_team_id,
      m.status,
      m.group_letter,
      m.highlight_summary,
      m.highlight_url,
      m.highlight_source_label,
      m.created_at,
      m.updated_at,
      v.stadium_name AS venue_stadium_name,
      v.city AS venue_city,
      v.state AS venue_state,
      v.country AS venue_country,
      v.country_code AS venue_country_code,
      v.country_flag AS venue_country_flag,
      v.capacity AS venue_capacity,
      v.roof_type AS venue_roof_type,
      v.elevation_m AS venue_elevation_m,
      v.past_world_cups AS venue_past_world_cups,
      ht.name_ja AS home_team_name_ja,
      ht.name_en AS home_team_name_en,
      ht.fifa_code AS home_team_fifa_code,
      ht.flag AS home_team_flag,
      ht.group_name AS home_team_group_name,
      at.name_ja AS away_team_name_ja,
      at.name_en AS away_team_name_en,
      at.fifa_code AS away_team_fifa_code,
      at.flag AS away_team_flag,
      at.group_name AS away_team_group_name,
      wt.name_ja AS winner_team_name_ja,
      wt.name_en AS winner_team_name_en,
      wt.fifa_code AS winner_team_fifa_code,
      wt.flag AS winner_team_flag,
      wt.group_name AS winner_team_group_name
    FROM matches m
    JOIN venues v ON v.id = m.venue_id
    LEFT JOIN teams ht ON ht.id = m.home_team_id
    LEFT JOIN teams at ON at.id = m.away_team_id
    LEFT JOIN teams wt ON wt.id = m.winner_team_id
    ${suffix}
  `;
}

function mapMatch(row: MatchRow): Match {
  return {
    id: row.id,
    stage: row.stage,
    matchDate: row.match_date,
    kickoffAt: row.kickoff_at,
    venueId: row.venue_id,
    homeSlot: row.home_slot,
    awaySlot: row.away_slot,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    winnerTeamId: row.winner_team_id,
    status: row.status,
    groupLetter: row.group_letter,
    highlightSummary: row.highlight_summary,
    highlightUrl: row.highlight_url,
    highlightSourceLabel: row.highlight_source_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMatchDetail(row: MatchDetailRow): MatchDetail {
  return {
    ...mapMatch(row),
    venue: {
      id: row.venue_id,
      stadiumName: row.venue_stadium_name,
      city: row.venue_city,
      state: row.venue_state,
      country: row.venue_country,
      countryCode: row.venue_country_code,
      countryFlag: row.venue_country_flag,
      capacity: row.venue_capacity,
      roofType: row.venue_roof_type,
      elevationM: row.venue_elevation_m,
      pastWorldCups: parsePastWorldCups(row.venue_past_world_cups),
    },
    homeTeam: mapJoinedTeam(row.home_team_id, {
      nameJa: row.home_team_name_ja,
      nameEn: row.home_team_name_en,
      fifaCode: row.home_team_fifa_code,
      flag: row.home_team_flag,
      groupName: row.home_team_group_name,
    }),
    awayTeam: mapJoinedTeam(row.away_team_id, {
      nameJa: row.away_team_name_ja,
      nameEn: row.away_team_name_en,
      fifaCode: row.away_team_fifa_code,
      flag: row.away_team_flag,
      groupName: row.away_team_group_name,
    }),
    winnerTeam: mapJoinedTeam(row.winner_team_id, {
      nameJa: row.winner_team_name_ja,
      nameEn: row.winner_team_name_en,
      fifaCode: row.winner_team_fifa_code,
      flag: row.winner_team_flag,
      groupName: row.winner_team_group_name,
    }),
  };
}

function rowAs<T>(row: unknown): T {
  return row as T;
}

function mapJoinedTeam(
  id: string | null,
  team: JoinedTeamFields,
): Team | null {
  if (!id || !team.nameJa || !team.nameEn || !team.fifaCode || !team.flag) {
    return null;
  }

  return {
    id,
    nameJa: team.nameJa,
    nameEn: team.nameEn,
    fifaCode: team.fifaCode,
    flag: team.flag,
    groupName: team.groupName,
  };
}
