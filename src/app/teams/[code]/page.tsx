import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, Container } from '@mantine/core';

import { JsonLd } from '@/components/JsonLd';
import { SquadPanel } from '@/components/SquadPanel';
import { getTeamSquad } from '@/db/queries';
import { getSiteUrl } from '@/lib/env';
import { buildBreadcrumbList } from '@/lib/structured-data';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ code: string }>;
};

/** チーム名を反映した動的メタデータ。OGP 画像（opengraph-image.tsx）と整合させる。 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  if (!/^[A-Za-z]{3}$/.test(code)) {
    return { title: '出場国' };
  }

  const squad = await getTeamSquad(code.toUpperCase());
  if (!squad) {
    return { title: '出場国' };
  }

  const { nameJa, nameEn } = squad.team;
  const title = `${nameJa} 代表`;
  const description = `${nameJa}（${nameEn}）の出場メンバー・監督。WC 2026 の代表スカッドをまとめています。`;
  const canonical = `/teams/${code.toLowerCase()}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'profile' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function TeamSquadPage({ params }: PageProps) {
  const { code } = await params;

  if (!/^[A-Za-z]{3}$/.test(code)) {
    notFound();
  }

  // 注: generateMetadata でも getTeamSquad を呼ぶ。libSQL の execute は fetch と違い
  // 自動 dedupe されないため同一リクエストで 2 回引くが、軽量 SELECT のため許容する。
  const squad = await getTeamSquad(code.toUpperCase());
  if (!squad) {
    notFound();
  }

  // 構造化データ: トップ → 出場国 → 当該国 のパンくず。
  const baseUrl = getSiteUrl();
  const breadcrumb = buildBreadcrumbList(baseUrl, [
    { name: 'トップ', path: '/' },
    { name: '出場国', path: '/teams' },
    { name: squad.team.nameJa, path: `/teams/${code.toLowerCase()}` },
  ]);

  return (
    <Container size="xl" py="xl">
      <JsonLd data={breadcrumb} />
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
