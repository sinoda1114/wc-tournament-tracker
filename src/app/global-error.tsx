'use client';

import { useEffect } from 'react';

/**
 * 最上位のフォールバック。root layout（<html>/<body>）自体のレンダリングが
 * 失敗したときだけ使われる稀なケース用。ここでは layout も Providers も
 * 適用されないため、自前で <html>/<body> を描き、Mantine に依存しない
 * 素のスタイルで最低限の案内＋再試行を出す。
 *
 * 配色はダークの --wc-* パレットに合わせた固定値（CSS 変数は読めない前提）。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[wc] global error boundary:', error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: '#0b1220',
          color: '#f8fafc',
          fontFamily:
            "'Segoe UI', 'Hiragino Sans', 'Yu Gothic UI', sans-serif",
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            border: '1px solid rgba(226, 232, 240, 0.18)',
            borderRadius: 16,
            background:
              'linear-gradient(180deg, #18233a, #121a2b)',
            padding: '2rem 1.5rem',
            boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
          }}
        >
          <h1
            style={{
              margin: '0 0 0.75rem',
              fontSize: '1.5rem',
              color: '#fbbf24',
            }}
          >
            予期しないエラーが発生しました
          </h1>
          <p
            style={{
              margin: '0 0 1.25rem',
              color: '#94a3b8',
              lineHeight: 1.7,
            }}
          >
            アプリの読み込みに失敗しました。お手数ですが、ページを再読み込みしてください。
          </p>
          {error.digest ? (
            <p
              style={{
                margin: '0 0 1.25rem',
                fontSize: '0.8rem',
                color: '#64748b',
              }}
            >
              エラーID: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              appearance: 'none',
              border: 0,
              borderRadius: 8,
              background: '#3b82f6',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              padding: '0.6rem 1.5rem',
              cursor: 'pointer',
            }}
          >
            再読み込み
          </button>
        </main>
      </body>
    </html>
  );
}
