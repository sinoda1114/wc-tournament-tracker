import type { Dictionary } from '@/lib/i18n/dictionary';

/** squad 辞書のうち注記（note*）キーだけを許す型。 */
export type SquadNoteKey = Extract<keyof Dictionary['squad'], `note${string}`>;

/**
 * 現実の名簿事情（負傷離脱・追加招集など）の注釈。FIFAコード → squad 辞書の注記キー。
 *
 * 別チームで同じことが起きたら、ここに1行足して i18n 辞書（ja/en/es/pt/zh）に
 * 注記キーを追加するだけでよい。注記が不要になったら行ごと削除する。
 * 頻度が低いのでコード定数で管理する（DB マイグレーションはしない）。
 */
export const SQUAD_NOTES: Partial<Record<string, SquadNoteKey>> = {
  // Balerdi 負傷離脱→Senesi 補充招集（2026-06-13）。
  ARG: 'noteArg',
  // 遠藤航が負傷離脱・代表引退、町野修斗が追加招集（2026-06-13）。
  JPN: 'noteJpn',
  // Timber 鼠径部負傷→Geertruida 補充招集（2026-06-13）。
  NED: 'noteNed',
  // Karl 左大腿筋損傷→Ouédraogo 補充招集（2026-06-13）。
  GER: 'noteGer',
  // Wesley 左太もも負傷→Éderson(MF) 補充招集（2026-06-13）。
  BRA: 'noteBra',
  // Gilmour 膝負傷→Fletcher 補充招集（2026-06-13）。
  SCO: 'noteSco',
  // Baumgartner 右太もも負傷→Ljubičić 補充招集（2026-06-13）。
  AUT: 'noteAut',
  // 監督交代: 初戦(スウェーデン1-5)後に Lamouchi 解任→Renard 就任（2026-06-16）。
  TUN: 'noteTun',
};
