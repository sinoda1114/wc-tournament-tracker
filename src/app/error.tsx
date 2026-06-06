'use client';

import { useEffect } from 'react';
import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';

/**
 * ルートレベルのエラー境界。RSC のデータ取得（例: DB 障害・env 欠落）や
 * レンダリング中の例外をここで拾い、素の 500 ではなく再試行できる UI を出す。
 * layout.tsx の <html>/<body> は保持されるため、ヘッダー等は表示されたまま。
 * 致命的に layout 自体が壊れた場合は global-error.tsx が引き継ぐ。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 開発時は詳細を、本番でも digest を辿れるよう console に出す。
    console.error('[wc] route error boundary:', error);
  }, [error]);

  return (
    <Container size="sm" py="xl">
      <div className="wc-error-card" role="alert">
        <Stack gap="md" align="center">
          <Title order={1} className="wc-error-title">
            問題が発生しました
          </Title>
          <Text c="dimmed" ta="center">
            データの読み込み中にエラーが発生しました。時間をおいて再度お試しください。
            問題が続く場合は、しばらくしてからアクセスしてください。
          </Text>
          {error.digest ? (
            <Text size="xs" c="dimmed" ta="center" className="wc-error-digest">
              エラーID: {error.digest}
            </Text>
          ) : null}
          <Group justify="center" gap="sm" mt="xs">
            <Button onClick={() => reset()} variant="filled">
              再試行
            </Button>
            <Button component="a" href="/" variant="default">
              トップへ戻る
            </Button>
          </Group>
        </Stack>
      </div>
    </Container>
  );
}
