import { recentDates } from '@/lib/ingest/thesportsdb';

import { handleIngestRequest } from '../_shared';

export const dynamic = 'force-dynamic';
// ホット取込もタイムライン同期を伴うため、通常取込と同じ上限を持たせる。
export const maxDuration = 60;

const HOT_WINDOW_DAYS = 2;

export async function GET(request: Request) {
  return handleIngestRequest(request, {
    mode: 'hot',
    // 未取込疑いはKO直後〜数時間の遅延吸収が主目的。UTC日付ズレも考慮して2日分に絞る。
    dates: recentDates(HOT_WINDOW_DAYS),
  });
}
