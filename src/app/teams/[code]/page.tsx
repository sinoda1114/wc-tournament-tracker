import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, Container } from '@mantine/core';

import { SquadPanel } from '@/components/SquadPanel';
import { getTeamSquad } from '@/db/queries';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TeamSquadPage({ params }: PageProps) {
  const { code } = await params;

  if (!/^[A-Za-z]{3}$/.test(code)) {
    notFound();
  }

  const squad = await getTeamSquad(code.toUpperCase());
  if (!squad) {
    notFound();
  }

  return (
    <Container size="xl" py="xl">
      <Button
        component={Link}
        href="/teams"
        variant="subtle"
        size="xs"
        px={6}
        mb="sm"
      >
        ← 出場国一覧に戻る
      </Button>
      <SquadPanel squad={squad} />
    </Container>
  );
}
