import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

import { seedBracketEdges } from '../data/seed-bracket-edges';
import { seedMatches } from '../data/seed-matches';
import {
  groupPositionToTeamId,
  roundOf32Assignments,
  seedTeams,
  teamRatings,
} from '../data/seed-teams';
import { seedVenues } from '../data/seed-venues';
import { getDb } from './client';

const db = getDb;

// グループステージ試合の Pos スロット ('A1' 等) から teamId を解決。
// Pos 記法でないスロットや、対応する teamId が無ければ null を返す。
function resolveGroupSlotTeamId(slot: string): string | null {
  if (!/^[A-L][1-4]$/.test(slot)) return null;
  return groupPositionToTeamId[slot] ?? null;
}

async function seed() {
  await db().batch(
    seedTeams.map((team) => {
      const rating = teamRatings[team.id];
      return {
        sql: `
        INSERT INTO teams (
          id,
          name_ja,
          name_en,
          fifa_code,
          flag,
          group_name,
          fifa_rank,
          wc_2014_place,
          wc_2018_place,
          wc_2022_place
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name_ja = excluded.name_ja,
          name_en = excluded.name_en,
          fifa_code = excluded.fifa_code,
          flag = excluded.flag,
          group_name = excluded.group_name,
          fifa_rank = excluded.fifa_rank,
          wc_2014_place = excluded.wc_2014_place,
          wc_2018_place = excluded.wc_2018_place,
          wc_2022_place = excluded.wc_2022_place
      `,
        args: [
          team.id,
          team.nameJa,
          team.nameEn,
          team.fifaCode,
          team.flag,
          team.groupName,
          rating?.fifaRank ?? null,
          rating?.wc2014Place ?? null,
          rating?.wc2018Place ?? null,
          rating?.wc2022Place ?? null,
        ],
      };
    }),
    'write',
  );

  // seedTeams に含まれない孤児チーム行を削除する。
  // 初期試作時の仮データ (Italy/Peru 等) や R32 用プレースホルダ
  // ('Third (A/B/C/D/F)' 等) が DB に残ると /favorites のグループ一覧に
  // 余計なセクションが現れるため、再 seed のたびに掃除する。
  //
  // 外部キー制約: matches.{home,away,winner}_team_id → teams(id) は
  // ON DELETE SET NULL なので、参照中のチームを消しても試合データ自体は
  // 残り、対象カラムが NULL になるだけ（既存の試合結果は失われない）。
  const teamIdPlaceholders = seedTeams.map(() => '?').join(', ');
  const deleteTeamsResult = await db().execute({
    sql: `DELETE FROM teams WHERE id NOT IN (${teamIdPlaceholders})`,
    args: seedTeams.map((team) => team.id),
  });
  console.log(`Deleted ${deleteTeamsResult.rowsAffected} obsolete teams`);

  await db().batch(
    seedVenues.map((venue) => ({
      sql: `
        INSERT INTO venues (
          id,
          stadium_name,
          city,
          state,
          country,
          country_code,
          country_flag,
          capacity,
          roof_type,
          elevation_m,
          past_world_cups
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          stadium_name = excluded.stadium_name,
          city = excluded.city,
          state = excluded.state,
          country = excluded.country,
          country_code = excluded.country_code,
          country_flag = excluded.country_flag,
          capacity = excluded.capacity,
          roof_type = excluded.roof_type,
          elevation_m = excluded.elevation_m,
          past_world_cups = excluded.past_world_cups
      `,
      args: [
        venue.id,
        venue.stadiumName,
        venue.city,
        venue.state,
        venue.country,
        venue.countryCode,
        venue.countryFlag,
        venue.capacity,
        venue.roofType,
        venue.elevationM,
        venue.pastWorldCups.length > 0
          ? JSON.stringify(venue.pastWorldCups)
          : null,
      ],
    })),
    'write',
  );

  // グループ試合は homeSlot/awaySlot ('A1'..'L4') から teamId を解決して直接埋める。
  // 決勝T (id 73-104) は seed 時点では NULL のまま（bracket_edges で進行）。
  await db().batch(
    seedMatches.map((match) => {
      const homeTeamId =
        match.stage === 'group_stage'
          ? resolveGroupSlotTeamId(match.homeSlot)
          : null;
      const awayTeamId =
        match.stage === 'group_stage'
          ? resolveGroupSlotTeamId(match.awaySlot)
          : null;

      return {
        sql: `
          INSERT INTO matches (
            id,
            stage,
            match_date,
            kickoff_at,
            venue_id,
            home_slot,
            away_slot,
            status,
            group_letter,
            home_team_id,
            away_team_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            stage = excluded.stage,
            match_date = excluded.match_date,
            kickoff_at = excluded.kickoff_at,
            venue_id = excluded.venue_id,
            home_slot = excluded.home_slot,
            away_slot = excluded.away_slot,
            group_letter = excluded.group_letter,
            -- グループ試合のみ既存値を上書き（決勝Tは伝播結果を保護するため触らない）
            home_team_id = CASE WHEN excluded.stage = 'group_stage' THEN excluded.home_team_id ELSE matches.home_team_id END,
            away_team_id = CASE WHEN excluded.stage = 'group_stage' THEN excluded.away_team_id ELSE matches.away_team_id END,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        `,
        args: [
          match.id,
          match.stage,
          match.matchDate,
          match.kickoffAt,
          match.venueId,
          match.homeSlot,
          match.awaySlot,
          match.status,
          match.groupLetter,
          homeTeamId,
          awayTeamId,
        ],
      };
    }),
    'write',
  );

  if (roundOf32Assignments.length > 0) {
    await db().batch(
      roundOf32Assignments.map((assignment) => ({
        sql: `
          UPDATE matches
          SET
            home_team_id = ?,
            away_team_id = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ?
            AND home_team_id IS NULL
            AND away_team_id IS NULL
        `,
        args: [assignment.homeTeamId, assignment.awayTeamId, assignment.matchId],
      })),
      'write',
    );
  }

  // 決勝T (id 73-104) を NULL にリセットする。
  // 初期試作時に古いダミーチーム ID が home/away_team_id に残っている DB だと、
  // フロントの MatchVersus が formatSlotLabel ではなく実チーム名を出してしまう。
  // 設計上「R32 以降はグループステージ終了後に bracket_edges 伝播 or 手動入力で
  // 確定」なので、seed 時点では NULL であるべき。
  // 既存の matches upsert は ON CONFLICT で決勝Tの home/away_team_id を保護する
  // ロジックになっており、これだけだと古いダミーが残り続けるため、明示的に
  // 後段で NULL リセットを掛ける。
  // 大会開幕前で試合結果はまだ存在しないので、このリセットでユーザー入力データが
  // 失われる懸念はない。グループ試合 (id 1-72) は対象外（チーム確定済み）。
  const resetKnockoutResult = await db().execute({
    sql: `
      UPDATE matches
      SET
        home_team_id = NULL,
        away_team_id = NULL,
        winner_team_id = NULL,
        home_score = NULL,
        away_score = NULL,
        status = 'scheduled',
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id BETWEEN 73 AND 104
    `,
    args: [],
  });
  console.log(`Reset ${resetKnockoutResult.rowsAffected} knockout matches`);

  await db().batch(
    seedBracketEdges.map((edge) => ({
      sql: `
        INSERT INTO bracket_edges (
          from_match_id,
          from_result,
          to_match_id,
          to_slot
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(from_match_id, from_result, to_match_id, to_slot) DO NOTHING
      `,
      args: [edge.fromMatchId, edge.fromResult, edge.toMatchId, edge.toSlot],
    })),
    'write',
  );
}

seed()
  .then(() => {
    console.log('Seed completed');
  })
  .catch((error: unknown) => {
    console.error('Seed failed');
    console.error(error);
    process.exitCode = 1;
  });
