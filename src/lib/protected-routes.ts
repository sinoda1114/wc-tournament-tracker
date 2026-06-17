/**
 * 登録ウォール（無料会員ログイン必須ルート）の単一情報源 / T-46。
 *
 * 【方針】「一覧・トップは公開 / 詳細・深掘りはログイン必須」。
 * T-44（#42）で proxy.ts は全ページ公開（auth.protect() 全面撤廃）にしたが、
 * 本モジュールは「詳細ページだけ」を保護対象として宣言的に列挙する。
 * proxy.ts は `isProtectedRoute(pathname)` が true のときだけ `auth.protect()` する。
 *
 * 課金（T-14）とは別レイヤー。ここでは課金を一切混ぜない（純粋にログイン要否のみ）。
 *
 * 【保護対象】
 *   - /matches/[id]   試合詳細（イベント/会場/天気）
 *   - /teams/[code]   チーム詳細（選手/スカッド）
 *
 * 【公開のまま（保護しない）】
 *   - /  /groups  /groups/[group]  /teams(一覧)  /matches(一覧/カレンダー)  /prediction
 *   - /rankings（得点王/スタッツ）… T-107 で無料閲覧化（課金は早割カード/ヘッダー導線で担保）
 *   - 上記詳細の OGP/メタ画像ルート（opengraph-image / twitter-image / icon 等。
 *     クローラのカード生成のため protect しない）
 *
 * 【locale 接頭辞対応】
 *   ロケール別URL（/en, /es, /pt, /zh 配下）も同じく保護する。T-44 で塞いだ
 *   「locale 素通り穴」を再発させないため、接頭辞付きパスもマッチさせる。
 *   既定の ja は接頭辞無し（`/matches/...`）なので、ja 接頭辞は考慮不要。
 *
 * 判定は pathname（クエリ・末尾スラッシュ無視）に対して行う純関数。proxy.ts と
 * ユニットテストの双方から import して、境界を1か所で担保する。
 */

/** ロケール別URLの接頭辞になり得るロケール（既定 ja はプレフィックス無しなので除く）。 */
const LOCALE_PREFIXES = ['en', 'es', 'pt', 'zh'] as const;

/**
 * メタ画像ルートのファイル名（拡張子は Next が付与）。これらで終わるパスは
 * クローラ向けの公開リソースなので保護対象から除外する。
 */
const META_IMAGE_SEGMENTS = [
  'opengraph-image',
  'twitter-image',
  'icon',
  'apple-icon',
] as const;

/** pathname を正規化する（クエリ除去・末尾スラッシュ除去・空なら '/'）。 */
function normalizePath(pathname: string): string {
  const path = pathname.split('?')[0].replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/**
 * 先頭の locale 接頭辞（en/es/pt/zh）を1つだけ剥がす。
 * 例: '/en/matches/51' → '/matches/51'、'/matches/51' → '/matches/51'。
 */
function stripLocalePrefix(path: string): string {
  const seg = path.split('/')[1] ?? '';
  if ((LOCALE_PREFIXES as readonly string[]).includes(seg)) {
    const rest = path.slice(seg.length + 1); // 先頭の '/<loc>' を除去
    return rest === '' ? '/' : rest;
  }
  return path;
}

/** 最終セグメントがメタ画像（OGP 等）なら true。 */
function isMetaImagePath(path: string): boolean {
  const last = path.split('/').pop() ?? '';
  // opengraph-image / opengraph-image.png / twitter-image-xyz.png 等を拾う
  return (META_IMAGE_SEGMENTS as readonly string[]).some(
    (seg) => last === seg || last.startsWith(`${seg}.`) || last.startsWith(`${seg}-`),
  );
}

/**
 * 保護対象パターン（locale 接頭辞を剥がした後のパスに対して判定）。
 *  - /matches/<id>    … 一覧 /matches 自身はマッチしない（後続セグメント必須）
 *  - /teams/<code>    … 一覧 /teams 自身はマッチしない
 *
 * /rankings は T-107 で公開（無料閲覧）に変更したため保護対象から除外。
 */
const PROTECTED_PATTERNS: readonly RegExp[] = [
  /^\/matches\/.+/, // /matches/[id]（一覧 /matches は除外）
  /^\/teams\/.+/, // /teams/[code]（一覧 /teams は除外）
];

/**
 * 与えられた pathname がログイン必須（登録ウォール）ルートか。
 * fail-closed が原則だが、本タスクは「一覧は公開・詳細だけ保護」という
 * 明示列挙ポリシーなので、列挙にマッチしたものだけ true を返す。
 */
export function isProtectedRoute(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  // OGP/メタ画像はクローラ向けに常に公開（詳細配下でも保護しない）。
  if (isMetaImagePath(normalized)) return false;

  const path = stripLocalePrefix(normalized);
  return PROTECTED_PATTERNS.some((re) => re.test(path));
}
