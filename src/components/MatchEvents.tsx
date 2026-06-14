import { CountryFlag } from '@/components/CountryFlag';
import type { MatchEvent, MatchEventType } from '@/db/match-events';
import type { MatchDetail, Team } from '@/db/queries';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { localizedTeamName } from '@/lib/i18n/team-name';

/** 種別ごとの簡易マーカー（追加アイコン依存を避け絵文字/記号で表現）。 */
const TYPE_MARK: Record<MatchEventType, string> = {
  goal: '\u{26BD}\u{FE0F}',
  own_goal: '\u{26BD}\u{FE0F}',
  penalty_goal: '\u{26BD}\u{FE0F}',
  yellow_card: '\u{1F7E8}',
  red_card: '\u{1F7E5}',
  substitution: '⇄',
};

type MatchEventsProps = {
  events: MatchEvent[];
  match: MatchDetail;
  dict: Dictionary;
  /** 国旗の aria-label/国名表示に使うロケール。未指定は 'ja'。 */
  locale?: Locale;
};

/**
 * 試合のできごと（得点・カード・交代）を時系列で表示する。
 * イベントが無ければ何も描画しない（null）。データは手動(admin)＋自動(ingest)の2系統。
 */
export function MatchEvents({ events, match, dict, locale = 'ja' }: MatchEventsProps) {
  if (events.length === 0) {
    return null;
  }

  const t = dict.match.events;

  // イベントの teamId からチームを解決する。どちらのチームか不明なら null（旗を出さない）。
  const teamFor = (teamId: string | null): Team | null => {
    if (!teamId) return null;
    if (match.homeTeam && teamId === match.homeTeam.id) return match.homeTeam;
    if (match.awayTeam && teamId === match.awayTeam.id) return match.awayTeam;
    return null;
  };

  return (
    <section className="wc-match-events" aria-label={t.aria}>
      <h3 className="wc-match-events-title">{t.title}</h3>
      <ol className="wc-match-events-list">
        {events.map((event) => {
          const team = teamFor(event.teamId);
          const teamName = localizedTeamName(team, locale);
          return (
            <li key={event.id} className={`wc-match-event wc-match-event-${event.type}`}>
              <span className="wc-match-event-minute">
                {event.minute !== null ? `${event.minute}'` : ''}
              </span>
              <span className="wc-match-event-mark" aria-hidden="true">
                {TYPE_MARK[event.type]}
              </span>
              <span className="wc-match-event-body">
                <span className="wc-match-event-player">
                  {team ? (
                    <span className="wc-match-event-flag" title={teamName}>
                      <CountryFlag fifaCode={team.fifaCode} ariaLabel={teamName} size="sm" />
                    </span>
                  ) : null}
                  {event.type === 'substitution' && event.playerOut
                    ? `${event.playerOut} → ${event.playerName}`
                    : event.playerName}
                </span>
                {event.type !== 'substitution' && event.playerOut ? (
                  <span className="wc-match-event-assist">{`${t.assist}: ${event.playerOut}`}</span>
                ) : null}
                <span className="wc-match-event-kind">{t.type[event.type]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
