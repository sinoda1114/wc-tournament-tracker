/**
 * 日本語メッセージ辞書（既定ロケール・正本）。
 * 他言語はこの型 {@link Dictionary} に一致させる（キー欠落を tsc + テストで検出）。
 * 文字列は段階的に増やしていく（まずは nav / header / language）。
 */
export const ja = {
  nav: {
    label: '主要ページ',
    groups: 'グループリーグ',
    knockout: '決勝T',
    teams: '出場国',
    prediction: '優勝予想',
    favorites: 'お気に入り',
  },
  header: {
    admin: '管理画面',
    skipToContent: 'メインコンテンツへスキップ',
  },
  language: {
    label: '言語',
  },
};

export type Dictionary = typeof ja;
