import { Center, Loader, Stack, Text } from '@mantine/core';

import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

/**
 * ルートの読み込み中 UI。RSC のデータ取得（DB アクセス等）中に
 * Next.js が Suspense 境界として表示する。ヘッダーは layout 側に残るため、
 * ここはコンテンツ領域のスピナーのみを担う。
 */
export default async function Loading() {
  const dict = getDictionary(await resolveLocale());
  return (
    <Center mih="60vh" role="status" aria-live="polite">
      <Stack align="center" gap="sm">
        <Loader color="blue" size="lg" type="dots" />
        <Text c="dimmed" size="sm">
          {dict.loading.text}
        </Text>
      </Stack>
    </Center>
  );
}
