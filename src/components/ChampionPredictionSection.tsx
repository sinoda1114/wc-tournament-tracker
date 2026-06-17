import { Stack, Title } from '@mantine/core';

import { ChampionPrediction } from '@/components/ChampionPrediction';
import { loadChampionPredictionData } from '@/lib/champion-prediction-data';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

/**
 * 優勝予想カードを「見出し付き」で出すサーバーコンポーネント。
 *
 * /prediction だけでなく /groups・/teams の上部にも同じ優勝予想を出すための共通ラッパ。
 * データ取得は {@link loadChampionPredictionData} に集約し、表示は既存の
 * {@link ChampionPrediction}（クライアント）に委ねる。見出しは優勝予想ページと同じ
 * 辞書（prediction.title）を使い、文言を一元化する。
 */
export async function ChampionPredictionSection() {
  const data = await loadChampionPredictionData();
  const dict = getDictionary(await resolveLocale());

  return (
    <Stack gap={4}>
      <Title order={2} size="h3">
        {dict.prediction.title}
      </Title>
      <ChampionPrediction
        teams={data.teams}
        factors={data.factors}
        eliminatedIds={data.eliminatedIds}
      />
    </Stack>
  );
}
