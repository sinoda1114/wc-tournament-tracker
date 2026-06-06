import type { Locale } from './config';
import { en } from './messages/en';
import { ja, type Dictionary } from './messages/ja';

const DICTIONARIES: Record<Locale, Dictionary> = { ja, en };

/** ロケールに対応するメッセージ辞書を返す（client/server 両用・next/headers 非依存）。 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
