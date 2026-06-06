import type { Locale } from './config';
import { en } from './messages/en';
import { es } from './messages/es';
import { ja, type Dictionary } from './messages/ja';
import { pt } from './messages/pt';
import { zh } from './messages/zh';

const DICTIONARIES: Record<Locale, Dictionary> = { ja, en, es, pt, zh };

/** ロケールに対応するメッセージ辞書を返す（client/server 両用・next/headers 非依存）。 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
