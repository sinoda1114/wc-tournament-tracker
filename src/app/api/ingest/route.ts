import { handleIngestRequest } from './_shared';

export const dynamic = 'force-dynamic';
// タイムライン取得は試合ごとに 1 リクエスト＋レート制限ペーシングがあるため、
// 既定タイムアウトでは不足し得る。上限を引き上げる（Vercel Hobby でも 60s まで可）。
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleIngestRequest(request, { mode: 'full' });
}
