import type { Dictionary } from './ja';

/** 英語メッセージ辞書。型 Dictionary によりキー欠落は tsc で弾かれる。 */
export const en: Dictionary = {
  nav: {
    label: 'Main navigation',
    groups: 'Groups',
    knockout: 'Knockout',
    teams: 'Teams',
    prediction: 'Prediction',
    favorites: 'Favorites',
  },
  header: {
    admin: 'Admin',
    skipToContent: 'Skip to main content',
  },
  language: {
    label: 'Language',
  },
};
