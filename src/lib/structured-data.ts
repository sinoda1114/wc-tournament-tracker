import type { MatchDetail } from '@/db/queries';
import { getParticipantLabel, STAGE_LABELS, type MatchStage } from '@/lib/bracket';

/**
 * 構造化データ（schema.org / JSON-LD）のビルダー群。
 *
 * - DB の MatchDetail から SportsEvent を、ルート階層から BreadcrumbList を組み立てる。
 * - 値は schema.org の語彙に寄せる。日時は ISO8601（kickoffAt がそのまま使える）。
 * - 非公式サイトのため、主催者（organizer）等の公式主体は名乗らない（知財・誤認回避）。
 * - URL は絶対化のため呼び出し側から baseUrl を受け取る（lib/env.getSiteUrl を渡す想定）。
 */

export type Breadcrumb = { name: string; path: string };

/** パンくず（BreadcrumbList）。path は先頭スラッシュ始まりの相対パスを渡す。 */
export function buildBreadcrumbList(
  baseUrl: string,
  items: Breadcrumb[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  };
}

/** schema.org の eventStatus / イベント開催状況を試合ステータスから導く。 */
function toEventStatus(status: MatchDetail['status']): string {
  // in_progress / scheduled / finished のいずれも「予定通り開催」扱い。延期・中止は現状データに無い。
  switch (status) {
    case 'scheduled':
    case 'in_progress':
    case 'finished':
    default:
      return 'https://schema.org/EventScheduled';
  }
}

/**
 * 試合詳細の SportsEvent。
 * competitor には確定済みのチームのみを載せる（未確定スロットは出さない）。
 */
export function buildSportsEvent(
  baseUrl: string,
  match: MatchDetail,
): Record<string, unknown> {
  const stageLabel = STAGE_LABELS[match.stage as MatchStage] ?? match.stage;
  const homeLabel = getParticipantLabel(match.homeTeam, match.homeSlot);
  const awayLabel = getParticipantLabel(match.awayTeam, match.awaySlot);

  const competitors: Record<string, unknown>[] = [];
  if (match.homeTeam) {
    competitors.push({ '@type': 'SportsTeam', name: match.homeTeam.nameJa });
  }
  if (match.awayTeam) {
    competitors.push({ '@type': 'SportsTeam', name: match.awayTeam.nameJa });
  }

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${homeLabel} vs ${awayLabel}（${stageLabel}）`,
    sport: 'Soccer',
    eventStatus: toEventStatus(match.status),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: `${baseUrl}/matches/${match.id}`,
    location: {
      '@type': 'Place',
      name: match.venue.stadiumName,
      address: {
        '@type': 'PostalAddress',
        addressLocality: match.venue.city,
        addressRegion: match.venue.state,
        addressCountry: match.venue.countryCode,
      },
    },
  };

  // 日時は TZ 付き ISO の kickoffAt を優先。無ければ会場ローカル暦日のみ。
  if (match.kickoffAt) {
    data.startDate = match.kickoffAt;
  } else if (match.matchDate) {
    data.startDate = match.matchDate;
  }

  if (competitors.length > 0) {
    data.competitor = competitors;
  }

  return data;
}
