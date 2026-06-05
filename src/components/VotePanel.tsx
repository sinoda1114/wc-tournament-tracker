'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, Text } from '@mantine/core';

import { CountryFlag } from '@/components/CountryFlag';
import { TeamSearchCombobox } from '@/components/TeamSearchCombobox';
import { castVoteAction } from '@/app/prediction/actions';

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
    <section className="wc-vote" aria-label="みんなの予想に投票">
      <h2 className="wc-vote-title">あなたの優勝予想</h2>

      {stage === null ? (
        <Text c="dimmed" size="sm">
          全ステージの投票が締め切られました。みんなの予想は最終結果として固定されます。
        </Text>
      ) : myVoteTeamId ? (
        <div className="wc-vote-form">
          <Text size="sm">
            <Text component="span" c="dimmed">
              {stageLabel}の投票済み：
            </Text>{' '}
            {myTeam ? (
              <span className="wc-vote-chosen">
                <CountryFlag fifaCode={myTeam.fifaCode} size="sm" ariaLabel={myTeam.nameJa} />
                <span>{myTeam.nameJa}</span>
              </span>
            ) : (
              myVoteTeamId.toUpperCase()
            )}
            <Text component="span" c="dimmed">
              （このステージはロック中）
            </Text>
          </Text>
          <Text c="dimmed" size="xs">
            {nextStageLabel
              ? `${nextStageLabel}に進むと、もう一度投票できます。最新の票が「みんなの予想」に反映されます。`
              : 'これが最後の投票です。'}
          </Text>
        </div>
      ) : (
        <div className="wc-vote-form">
          <Text size="sm">
            現在は<strong>{stageLabel}</strong>。優勝すると思う国を1票選んでください（日本語名・英語名・FIFAコードで検索）。
          </Text>

          <div className="wc-vote-controls">
            <TeamSearchCombobox
              className="wc-vote-search"
              teams={candidates}
              ariaLabel="優勝予想の国を検索"
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
              投票する
            </Button>
          </div>

          <Text c="dimmed" size="sm" className="wc-vote-note">
            大会の進行（
            <span className="wc-vote-emph">グループリーグ → ラウンド32 → ラウンド16 → 準々決勝 → 準決勝 → 決勝</span>
            ）ごとに
            <span className="wc-vote-emph">1回ずつ投票</span>
            でき、各ユーザーの<strong>最新の票</strong>が「みんなの予想」に反映されます。
            <span className="wc-vote-emph">同じステージでは投票後の変更はできません。</span>
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
