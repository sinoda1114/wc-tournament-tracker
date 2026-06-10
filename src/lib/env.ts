/**
 * 起動時の環境変数バリデーション（DB 接続に必要な Turso 資格情報）。
 *
 * 目的:
 *  - `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` の欠落を、素の libSQL 例外より
 *    分かりやすいメッセージで早期に検知する。
 *  - 不足している変数名を列挙して「何を設定すべきか」を一目で伝える。
 *
 * 方針:
 *  - import 副作用では throw しない（モジュール読み込み時にビルド/SSR を巻き込まないため）。
 *    実際に DB が必要になる `getDb()` から `requireDbEnv()` を明示的に呼ぶ。
 *  - `TURSO_AUTH_TOKEN` はローカルの file: / http://localhost 接続では不要なので、
 *    リモート（libsql:// や https://）URL のときだけ必須にする。
 */

/** DB 接続に必要な env が欠けているときに投げる、人間可読なエラー。 */
export class MissingEnvError extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    const list = missing.join(', ');
    super(
      `必要な環境変数が設定されていません: ${list}\n` +
        '`.env`（または Vercel の環境変数）に Turso の接続情報を設定してください。' +
        ' 例は .env.example を参照してください。',
    );
    this.name = 'MissingEnvError';
    this.missing = missing;
  }
}

/** リモート Turso（認証トークンが要る）かどうかを URL スキームから判定する。 */
function isRemoteTursoUrl(url: string): boolean {
  return /^(libsql:|wss:|https:)/i.test(url.trim());
}

/**
 * 本番デプロイ先の絶対 URL（末尾スラッシュ無し）。
 *
 * SEO 系（sitemap / robots / OGP / canonical / JSON-LD）は相対パスでは成立せず
 * 絶対 URL が要るため、ここで一元的に解決する。優先順位:
 *   1. `NEXT_PUBLIC_SITE_URL`（自前ドメイン確定後に設定する正準値）
 *   2. `VERCEL_PROJECT_PRODUCTION_URL`（Vercel が本番ドメインを自動注入。ホスト名のみ）
 *   3. フォールバックのプレースホルダ（下記）
 *
 * フォールバックは確定済みの本番ドメイン（matchfav.com / 2026-06-11 ブランド確定）。
 * 環境ごとに上書きする場合は `NEXT_PUBLIC_SITE_URL` を設定する。
 */
export const SITE_URL_FALLBACK = 'https://matchfav.com';

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  // Vercel は本番環境にホスト名のみ（スキーム無し）を入れるので https を補う。
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/+$/, '')}`;
  }

  return SITE_URL_FALLBACK;
}

/** {@link getSiteUrl} を URL オブジェクトで返す（metadataBase 等が要求する型）。 */
export function getSiteUrlObject(): URL {
  return new URL(getSiteUrl());
}

export type DbEnv = {
  databaseUrl: string;
  authToken: string | undefined;
};

/**
 * DB 接続用 env を検証して返す。欠落時は {@link MissingEnvError} を投げる。
 * リモート URL のときだけ `TURSO_AUTH_TOKEN` も必須とする。
 */
export function requireDbEnv(): DbEnv {
  const databaseUrl = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;

  const missing: string[] = [];
  if (!databaseUrl) {
    missing.push('TURSO_DATABASE_URL');
  }
  // URL がリモート系で、かつトークン未設定なら不足として扱う。
  if (databaseUrl && isRemoteTursoUrl(databaseUrl) && !authToken) {
    missing.push('TURSO_AUTH_TOKEN');
  }

  if (missing.length > 0) {
    throw new MissingEnvError(missing);
  }

  // databaseUrl は missing 判定を通過しているので非 null。
  return { databaseUrl: databaseUrl as string, authToken };
}
