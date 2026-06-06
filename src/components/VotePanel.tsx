'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, Text } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { TeamSearchCombobox } from '@/components/TeamSearchCombobox';
import { castVoteAction } from '@/app/prediction/actions';
import { useI18n } from '@/lib/i18n/context';
import { localizedTeamName } from '@/lib/i18n/team-name';

type Candidate = { id: string; nameJa: string; nameEn: string; fifaCode: string };

type VotePanelProps = {
  /** 現在投票できるステージ。null なら締切。 */
  stage: string | null;
  stageLabel: string | null;
  /** 次に投票できるステージ名（無ければ null＝決勝が現在ステージ等）。 */
  nextStageLabel: string | null;
  candidates: Candidate[];
  /** このステージで自分が既に投じたチーム（無ければ null）。 */
  myVoteTeamId: string | null;
};

export function VotePanel({
  stage,
  stageLabel,
  nextStageLabel,
  candidates,
  myVoteTeamId,
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
  const [pending, startTransition] = useTransition();

  const myTeam = myVoteTeamId
    ? candidates.find((c) => c.id === myVoteTeamId)
    : null;

  function submit() {
    if (!stage || !selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await castVoteAction(stage, selectedId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message);
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

          <Text c="dimmed" size="sm" className="wc-vote-note">
            {t.noteLine1.replace('{progression}', progression)}{' '}
            <span className="wc-vote-emph">{t.noteNoChange}</span>
          </Text>

          {error ? (
            <Text c="red" size="sm">
              {error}
            </Text>
          ) : null}
        </div>
      )}
    </section>
  );
}
