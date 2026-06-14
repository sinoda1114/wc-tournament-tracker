import type { MatchStatus } from '@/db/queries';

/**
 * 取込データの自動セルフ監査（T-82・再発防止の本命）。
 *
 * 目的: これまで「データ欠落を毎回 人手で Yahoo と突合して発見」していたモグラ叩きを卒業し、
 * ズレを **自動検知** する。検知は2系統:
 *  - 鮮度監査(stale): KO 後 N 時間経っても `finished` でない試合 = 試合まるごと未取込の疑い（T-81クラス）。
 *  - 整合監査(score): `finished` 試合で「得点イベント件数 ≠ スコア合計」= 得点者の取りこぼし/過多（T-76クラス）。
 *
 * 本モジュールは **純関数のみ**（I/O を持たない）。DB 取得は `@/db/audit`、組み立ては `run-audit.ts`。
 */

/** 鮮度監査の既定しきい値（時間）。KO + この時間を過ぎても未終了なら検知（グループステージ基準）。 */
export const DEFAULT_STALE_HOURS = 2.5;

/**
 * 決勝トーナメントは延長(+30分)＋PK＋中断で実時間が伸びるため、しきい値に加算する猶予（時間）。
 * これが無いと、正常に延長/PK中の試合を KO+2.5h 時点で「未取込疑い(error)」と誤検知してしまう。
 */
export const KNOCKOUT_EXTRA_HOURS = 1.5;

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** ステージ別の実効しきい値（時間）。グループは base、決勝Tは base + 延長猶予。 */
function effectiveStaleHours(stage: string, base: number): number {
  return stage === 'group_stage' ? base : base + KNOCKOUT_EXTRA_HOURS;
}

/** 監査に必要な試合行の最小情報。 */
export type AuditMatchInput = {
  id: number;
  stage: string;
  groupLetter: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  /** ISO8601。null なら matchDate で代替（粗い）。 */
  kickoffAt: string | null;
  matchDate: string;
};

/** 整合監査で使う得点系イベントの最小情報。team_id は「得点した選手の所属チーム」。 */
export type AuditGoalEvent = {
  matchId: number;
  type: 'goal' | 'penalty_goal' | 'own_goal';
  /** 得点した選手の所属チーム（own_goal は相手の得点になる）。未解決は null。 */
  teamId: string | null;
};

export type AuditFindingKind =
  | 'stale_unfinished'
  | 'scorers_incomplete'
  | 'scorers_excess'
  | 'scorers_side_mismatch';

export type AuditSeverity = 'error' | 'warn';

export type AuditFinding = {
  matchId: number;
  kind: AuditFindingKind;
  severity: AuditSeverity;
  message: string;
  /** admin 表示・機械可読用の付帯情報。 */
  context: Record<string, number | string | null>;
};

export type AuditReport = {
  /** 監査実行時刻(ISO)。 */
  generatedAt: string;
  /** 監査対象にした試合数。 */
  checkedMatches: number;
  findings: AuditFinding[];
  counts: {
    /** 鮮度監査（未取込疑い）の件数。 */
    staleUnfinished: number;
    /** 整合監査（得点者の過不足/左右ズレ）の件数。 */
    scoreMismatch: number;
  };
};

export type AuditConfig = {
  /** 鮮度監査のしきい値（時間）。既定 2.5h。 */
  staleHours?: number;
  /** 監査基準時刻。テスト用に固定可能。既定は実行時刻。 */
  now?: Date;
};

/**
 * 鮮度監査の判定時刻(ms)を返す。
 * - kickoffAt があればそれ + staleMs。
 * - 無ければ matchDate の「翌日0:00Z」+ staleMs（KO時刻不明の同日試合を誤検知しないよう一日まるごと猶予）。
 */
export function staleThresholdMs(
  stage: string,
  kickoffAt: string | null,
  matchDate: string,
  staleHours: number = DEFAULT_STALE_HOURS,
): number | null {
  const staleMs = effectiveStaleHours(stage, staleHours) * MS_PER_HOUR;
  if (kickoffAt) {
    const ko = Date.parse(kickoffAt);
    if (!Number.isNaN(ko)) return ko + staleMs;
  }
  // kickoffAt 欠落時の保守的フォールバック。matchDate は 'YYYY-MM-DD'（DB上はUTC日付）。
  // 「翌日0:00Z + 猶予」とし、現地夕方KOの同日試合を誤検知しない（検知が遅れる側に倒す）。
  const dayStart = Date.parse(`${matchDate}T00:00:00Z`);
  if (!Number.isNaN(dayStart)) return dayStart + MS_PER_DAY + staleMs;
  return null;
}

/** 得点イベントから home/away の得点を導出する（own_goal は相手側へ加算）。 */
function deriveSideScores(
  events: AuditGoalEvent[],
  homeTeamId: string,
  awayTeamId: string,
): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const e of events) {
    if (e.type === 'own_goal') {
      // own_goal は「相手チームの得点」。team_id は得点者の所属チームなので反転して加算する。
      if (e.teamId === homeTeamId) away += 1;
      else if (e.teamId === awayTeamId) home += 1;
    } else if (e.teamId === homeTeamId) {
      home += 1;
    } else if (e.teamId === awayTeamId) {
      away += 1;
    }
  }
  return { home, away };
}

/**
 * 試合配列と得点イベント配列を突き合わせ、監査所見を生成する純関数。
 *
 * 設計上の堅牢化:
 * - 整合監査は **まず合計（得点イベント総数 vs スコア合計）** で判定する。
 *   own_goal の左右割当や team_id 欠落に影響されず、報告された欠落クラス（T-76）を確実に拾う。
 * - 合計が一致したときだけ、全イベントが team_id 解決済みなら **左右の割当ズレ** を追加チェックする（弱シグナル）。
 * - 鮮度監査は両チーム確定済み（homeTeamId/awayTeamId 非null）の未終了試合のみ対象（TBD枠を誤検知しない）。
 */
export function auditMatches(
  matches: AuditMatchInput[],
  goalEvents: AuditGoalEvent[],
  config: AuditConfig = {},
): AuditReport {
  const staleHours = config.staleHours ?? DEFAULT_STALE_HOURS;
  const now = config.now ?? new Date();
  const nowMs = now.getTime();

  const eventsByMatch = new Map<number, AuditGoalEvent[]>();
  for (const e of goalEvents) {
    const bucket = eventsByMatch.get(e.matchId) ?? [];
    bucket.push(e);
    eventsByMatch.set(e.matchId, bucket);
  }

  const findings: AuditFinding[] = [];

  for (const m of matches) {
    // --- 鮮度監査: 両チーム確定済みの未終了試合で KO しきい値を過ぎている ---
    if (m.status !== 'finished' && m.homeTeamId && m.awayTeamId) {
      const effHours = effectiveStaleHours(m.stage, staleHours);
      const threshold = staleThresholdMs(m.stage, m.kickoffAt, m.matchDate, staleHours);
      if (threshold !== null && nowMs > threshold) {
        findings.push({
          matchId: m.id,
          kind: 'stale_unfinished',
          severity: 'error',
          message: `KO後 約${effHours} 時間以上経過しても未終了（status=${m.status}）。試合結果が未取込の可能性。`,
          context: {
            status: m.status,
            kickoffAt: m.kickoffAt,
            matchDate: m.matchDate,
            stage: m.stage,
            group: m.groupLetter,
          },
        });
      }
    }

    // --- 整合監査: 確定済み（両スコア記録あり）で得点イベントとスコアを突合 ---
    if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null) {
      const events = eventsByMatch.get(m.id) ?? [];
      const totalScore = m.homeScore + m.awayScore;
      const eventGoals = events.length;

      if (eventGoals < totalScore) {
        findings.push({
          matchId: m.id,
          kind: 'scorers_incomplete',
          severity: 'warn',
          message: `得点者データ不足：スコア合計 ${totalScore} に対し得点イベント ${eventGoals} 件（取りこぼし疑い）。`,
          context: {
            totalScore,
            eventGoals,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            stage: m.stage,
            group: m.groupLetter,
          },
        });
      } else if (eventGoals > totalScore) {
        findings.push({
          matchId: m.id,
          kind: 'scorers_excess',
          severity: 'warn',
          message: `得点イベント過多：スコア合計 ${totalScore} に対し得点イベント ${eventGoals} 件（重複/誤取込疑い）。`,
          context: {
            totalScore,
            eventGoals,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            stage: m.stage,
            group: m.groupLetter,
          },
        });
      } else if (
        eventGoals > 0 &&
        m.homeTeamId &&
        m.awayTeamId &&
        events.every((e) => e.teamId !== null)
      ) {
        // 合計一致＋全件 team_id 解決済み → 左右割当ズレの弱チェック。
        const derived = deriveSideScores(events, m.homeTeamId, m.awayTeamId);
        if (derived.home !== m.homeScore || derived.away !== m.awayScore) {
          findings.push({
            matchId: m.id,
            kind: 'scorers_side_mismatch',
            severity: 'warn',
            message: `得点の左右割当ズレ：記録 ${m.homeScore}-${m.awayScore} に対し得点者集計 ${derived.home}-${derived.away}。`,
            context: {
              recordedHome: m.homeScore,
              recordedAway: m.awayScore,
              derivedHome: derived.home,
              derivedAway: derived.away,
              stage: m.stage,
              group: m.groupLetter,
            },
          });
        }
      }
    }
  }

  const staleUnfinished = findings.filter((f) => f.kind === 'stale_unfinished').length;
  const scoreMismatch = findings.length - staleUnfinished;

  return {
    generatedAt: now.toISOString(),
    checkedMatches: matches.length,
    findings,
    counts: { staleUnfinished, scoreMismatch },
  };
}
