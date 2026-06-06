import Link from 'next/link';
import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';

/**
 * 404 の着地ページ。notFound()（チーム/試合/グループ詳細など）や
 * 未定義パスへのアクセス時に表示する。layout の <html>/<body>・ヘッダーは
 * そのまま使われるので、ここはコンテンツ領域の案内のみ。
 */
export default function NotFound() {
  return (
    <Container size="sm" py="xl">
      <div className="wc-error-card">
        <Stack gap="md" align="center">
          <Text className="wc-notfound-code" aria-hidden="true">
            404
          </Text>
          <Title order={1} className="wc-error-title">
            ページが見つかりません
          </Title>
          <Text c="dimmed" ta="center">
            お探しのページは存在しないか、移動した可能性があります。
            URL をご確認のうえ、トップページからお進みください。
          </Text>
          <Group justify="center" gap="sm" mt="xs">
            <Button component={Link} href="/" variant="filled">
              トップへ戻る
            </Button>
            <Button component={Link} href="/groups" variant="default">
              グループリーグを見る
            </Button>
          </Group>
        </Stack>
      </div>
    </Container>
  );
}
