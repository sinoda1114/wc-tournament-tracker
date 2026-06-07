import { Container, Group, Stack, Text, Title } from '@mantine/core';

import { ButtonLink } from '@/components/RouterLink';
import { getDictionary } from '@/lib/i18n/dictionary';
import { resolveLocale } from '@/lib/i18n/server';

/**
 * 404 の着地ページ。notFound()（チーム/試合/グループ詳細など）や
 * 未定義パスへのアクセス時に表示する。layout の <html>/<body>・ヘッダーは
 * そのまま使われるので、ここはコンテンツ領域の案内のみ。
 */
export default async function NotFound() {
  const t = getDictionary(await resolveLocale()).notFound;
  return (
    <Container size="sm" py="xl">
      <div className="wc-error-card">
        <Stack gap="md" align="center">
          <Text className="wc-notfound-code" aria-hidden="true">
            404
          </Text>
          <Title order={1} className="wc-error-title">
            {t.title}
          </Title>
          <Text c="dimmed" ta="center">
            {t.body}
          </Text>
          <Group justify="center" gap="sm" mt="xs">
            <ButtonLink href="/" variant="filled">
              {t.backHome}
            </ButtonLink>
            <ButtonLink href="/groups" variant="default">
              {t.viewGroups}
            </ButtonLink>
          </Group>
        </Stack>
      </div>
    </Container>
  );
}
