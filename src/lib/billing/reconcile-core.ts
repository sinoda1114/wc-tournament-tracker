/**
 * 課金突合の純ロジック（#159）。Stripe / DB を import しない（テスト容易・stripe 未解決の影響なし）。
 * I/O 付きの実体は `reconcile.ts`（Stripe events 取得・entitlement 付与）。
 */

/** 突合に使う「支払い済みセッション」の最小情報。 */
export type PaidSession = {
  userId: string;
  sessionId: string;
  email: string | null;
  customerId: string | null;
};

export type ReconcileResult = {
  /** 突合した一意ユーザー数。 */
  checkedUsers: number;
  /** 払ったのに未付与だったセッション。 */
  missing: PaidSession[];
  /** 自動修復（entitlement 付与）したセッション。 */
  healed: PaidSession[];
};

/**
 * paid セッション群のうち entitlement が無いユーザーを抽出する（純ロジック・判定は注入）。
 * 同一ユーザーの重複セッションは1回だけ判定する。
 */
export async function findMissingGrants(
  sessions: readonly PaidSession[],
  isGranted: (userId: string) => Promise<boolean>,
): Promise<PaidSession[]> {
  const missing: PaidSession[] = [];
  const seen = new Set<string>();
  for (const session of sessions) {
    if (seen.has(session.userId)) continue;
    seen.add(session.userId);
    if (!(await isGranted(session.userId))) missing.push(session);
  }
  return missing;
}

/** 突合結果から Discord 通知本文を作る（純関数）。 */
export function buildBillingAlertMessage(result: ReconcileResult): string {
  const healedIds = new Set(result.healed.map((s) => s.sessionId));
  const lines: string[] = [
    '🛒 **課金突合アラート**: 支払い済みなのに entitlement が無いユーザーを検知しました。',
    `検知 ${result.missing.length}件 / 自動付与 ${result.healed.length}件（突合ユーザー ${result.checkedUsers}名）。`,
  ];
  for (const s of result.missing.slice(0, 10)) {
    const tag = healedIds.has(s.sessionId) ? '✅自動付与済' : '⚠️未付与のまま';
    lines.push(`- ${tag} user=\`${s.userId}\` email=${s.email ?? '?'} session=\`${s.sessionId}\``);
  }
  if (result.missing.length > 10) lines.push(`…ほか ${result.missing.length - 10}件`);
  lines.push(
    '原因（webhook 署名不一致/エンドポイント無効 等）が継続していないか確認してください（自動付与は応急処置）。',
  );
  return lines.join('\n');
}
