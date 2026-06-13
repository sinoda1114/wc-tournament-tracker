'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Anchor, Button, Text } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { TeamSearchCombobox } from '@/components/TeamSearchCombobox';
import { castVoteAction } from '@/app/prediction/actions';
import { useI18n } from '@/lib/i18n/context';
import { localizedTeamName } from '@/lib/i18n/team-name';

type Candidate = { id: string; nameJa: string; nameEn: string; fifaCode: string };

/** アーカイブ（過去ラウンド）1件分の集計結果。 */
type ArchiveEntry = {
  stage: string;
  label: string;
  /** そのラウンドの総投票数。 */
  total: number;
  /** 得票上位（最大5件）。 */
  results: { team: Candidate | null; teamId: string; count: number }[];
};

type VotePanelProps = {
  /** 現在投票できるステージ。null なら締切。 */
  stage: string | null;
  stageLabel: string | null;
  /** 次に投票できるステージ名（無ければ null＝決勝が現在ステージ等）。 */
  nextStageLabel: string | null;
  candidates: Candidate[];
  /** このステージで自分が既に投じたチーム（無ければ null）。 */
  myVoteTeamId: string | null;
  /** 過去ラウンドの投票結果（履歴）。新しい順は呼び出し側で整える。 */
  archives?: ArchiveEntry[];
};

export function VotePanel({
  stage,
  stageLabel,
  nextStageLabel,
  candidates,
  myVoteTeamId,
  archives = [],
}: VotePanelProps) {
  const { locale, dict } = useI18n();
  const t = dict.vote;
  const progression = (
    ['group_stage', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'] as const
  )
    .map((s) => dict.match.stage[s])
    .join(' → ');
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [pending, startTransition] = useTransition();

  const myTeam = myVoteTeamId
    ? candidates.find((c) => c.id === myVoteTeamId)
    : null;

  function submit() {
    if (!stage || !selectedId) return;
    setError(null);
    setNeedsAuth(false);
    startTransition(async () => {
      const result = await castVoteAction(stage, selectedId);
      if (result.ok) {
        router.refresh();
      } else {
        // サーバーの message は日本語固定なので、reason コードを閲覧言語の辞書に引き直す。
        setError(t.errors[result.reason] ?? result.message);
        setNeedsAuth(result.reason === 'auth');
        if (result.reason === 'locked' || result.reason === 'wrong_stage') {
          router.refresh();
        }
      }
    });
  }

  return (
    <section className="wc-vote" aria-label={t.sectionAria}>
      <h2 className="wc-vote-title">{t.title}</h2>

      {stage === null ? (
        <Text c="dimmed" size="sm">
          {t.closed}
        </Text>
      ) : myVoteTeamId ? (
        <div className="wc-vote-form">
          <Text size="sm">
            <Text component="span" c="dimmed">
              {t.votedPrefix.replace('{stage}', stageLabel ?? '')}
            </Text>{' '}
            {myTeam ? (
              <span className="wc-vote-chosen">
                <CountryFlag fifaCode={myTeam.fifaCode} size="sm" ariaLabel={myTeam.nameJa} />
                <span>{localizedTeamName(myTeam, locale)}</span>
              </span>
            ) : (
              myVoteTeamId.toUpperCase()
            )}
            <Text component="span" c="dimmed">
              {t.locked}
            </Text>
          </Text>
          <Text c="dimmed" size="xs">
            {nextStageLabel ? t.nextInfo.replace('{stage}', nextStageLabel) : t.lastVote}
          </Text>
        </div>
      ) : (
        <div className="wc-vote-form">
          <Text size="sm">
            {t.currentPrefix}
            <strong>{stageLabel}</strong>
            {t.currentSuffix}
          </Text>

          <div className="wc-vote-controls">
            <TeamSearchCombobox
              className="wc-vote-search"
              teams={candidates}
              ariaLabel={t.searchAria}
              maxDropdownHeight={320}
              fillInputOnSelect
              onSelect={(t) => setSelectedId(t.id)}
              onQueryChange={() => setSelectedId(null)}
            />

            <Button
              onClick={submit}
              disabled={!selectedId}
              loading={pending}
              className="wc-vote-submit"
            >
              {t.submit}
            </Button>
          </div>

          {/* 国を未選択の間だけ表示する控えめなガイド（T-69）。投票ボタンが押せない理由を事前に伝える。 */}
          {!selectedId ? (
            <Text c="dimmed" size="xs" className="wc-vote-hint">
              {t.selectHint}
            </Text>
          ) : null}

          <Text c="dimmed" size="sm" className="wc-vote-note">
            {t.noteLine1.replace('{progression}', progression)}{' '}
            <span className="wc-vote-emph">{t.noteNoChange}</span>
          </Text>

          {error ? (
            <Text c="red" size="sm">
              {error}
              {needsAuth ? (
                <>
                  {' '}
                  <Anchor component={Link} href="/sign-in">
                    {dict.header.signIn}
                  </Anchor>
                </>
              ) : null}
            </Text>
          ) : null}
        </div>
      )}

      {archives.length > 0 ? (
        <details className="wc-vote-archive">
          <summary className="wc-vote-archive-summary">{t.archiveTitle}</summary>
          <p className="wc-vote-archive-desc">{t.archiveDesc}</p>
          <ul className="wc-vote-archive-list">
            {archives.map((entry) => (
              <li key={entry.stage} className="wc-vote-archive-stage">
                <h3 className="wc-vote-archive-stage-title">
                  {entry.label}
                  <span className="wc-vote-archive-total">
                    {t.archiveTotal.replace('{count}', String(entry.total))}
                  </span>
                </h3>
                {entry.results.length === 0 ? (
                  <Text c="dimmed" size="xs">
                    {t.archiveEmpty}
                  </Text>
                ) : (
                  <ol className="wc-vote-archive-results">
                    {entry.results.map((r, i) => (
                      <li key={r.teamId} className="wc-vote-archive-row">
                        <span className="wc-vote-archive-rank">{i + 1}</span>
                        {r.team ? (
                          <span className="wc-vote-archive-team">
                            <CountryFlag
                              fifaCode={r.team.fifaCode}
                              size="sm"
                              ariaLabel={r.team.nameJa}
                            />
                            <span>{localizedTeamName(r.team, locale)}</span>
                          </span>
                        ) : (
                          <span className="wc-vote-archive-team">{r.teamId.toUpperCase()}</span>
                        )}
                        <span className="wc-vote-archive-count">
                          {t.archiveVotes.replace('{count}', String(r.count))}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
