import { Button, Stack, Text, Title } from '@mantine/core';

import type { Dictionary } from '@/lib/i18n/dictionary';

type MatchHighlightProps = {
  /** 自前で書いた短いハイライト要約（無ければ null）。 */
  summary: string | null;
  /** 公式ハイライトの外部URL（無ければ null）。 */
  url: string | null;
  /** リンク元ラベル（例「FIFA公式」。無ければ null）。 */
  sourceLabel: string | null;
  dict: Dictionary;
};

/**
 * T-90: 試合のハイライト欄。スタメンとタイムラインの間に表示する。
 * 自前の短い要約文 + 公式外部リンクのみを出す無料機能。
 * 本文・URL のどちらも無ければ欄ごと非表示（空枠を出さない）。
 * 動画は保持せず、公式リンクは新しいタブで rel="noopener noreferrer" 付きで開く。
 */
export function MatchHighlight({ summary, url, sourceLabel, dict }: MatchHighlightProps) {
  const trimmedSummary = summary?.trim() ?? '';
  const trimmedUrl = url?.trim() ?? '';
  const hasSummary = trimmedSummary.length > 0;
  const hasUrl = trimmedUrl.length > 0;

  // 本文も公式URLも無ければ何も描画しない。
  if (!hasSummary && !hasUrl) {
    return null;
  }

  const t = dict.matchDetail.highlight;
  const trimmedLabel = sourceLabel?.trim() ?? '';
  // スクリーンリーダー向け: 「公式リンク・FIFA公式（新しいタブ）」のように出自を明示。
  const linkAria = trimmedLabel
    ? `${t.cta}（${t.officialLink}・${trimmedLabel}）`
    : `${t.cta}（${t.officialLink}）`;

  return (
    <Stack
      component="section"
      aria-label={t.heading}
      p="lg"
      gap="sm"
      style={{
        border: '1px solid var(--wc-border)',
        borderRadius: 16,
        background: 'var(--wc-surface)',
      }}
    >
      <Title order={2} size="h4">
        {t.heading}
      </Title>

      {hasSummary ? <Text>{trimmedSummary}</Text> : null}

      {hasUrl ? (
        <Stack gap={4} align="flex-start">
          <Button
            component="a"
            href={trimmedUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={linkAria}
            variant="light"
          >
            {t.cta}
          </Button>
          {trimmedLabel ? (
            <Text size="sm" c="dimmed">
              {t.officialLink}・{trimmedLabel}
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
