// Wikipedia「2026 FIFA World Cup squads」の wikitext から監督情報を抽出する
// 共有ロジック。fetch-squads.ts 本体から分離し、ユニットテストおよび
// 復旧スクリプトから main() を実行せずに再利用できるようにしている。

export type ParsedCoach = {
  name: string;
  nameJa: string | null;
  flagCode: string | null;
  /** 英語版 Wikipedia の記事タイトル（リンク先）。日本語名解決に使う。 */
  link: string | null;
};

// flagicon の 3 文字コード（IOC/FIFA 系）-> 旗用 ISO2。監督の母国旗に使う。
// 外国人監督に旗テンプレートが付く（自国監督は省略）。未知コードは null。
export const CODE_TO_ISO: Record<string, string> = {
  ITA: 'it', GER: 'de', NED: 'nl', ESP: 'es', FRA: 'fr', POR: 'pt',
  ARG: 'ar', BRA: 'br', ENG: 'gb-eng', SCO: 'gb-sct', WAL: 'gb-wls',
  NIR: 'gb-nir', IRL: 'ie', BEL: 'be', CRO: 'hr', SRB: 'rs', GRE: 'gr',
  SUI: 'ch', AUT: 'at', DEN: 'dk', SWE: 'se', NOR: 'no', POL: 'pl',
  RUS: 'ru', UKR: 'ua', URU: 'uy', COL: 'co', CHI: 'cl', MEX: 'mx',
  USA: 'us', JPN: 'jp', KOR: 'kr', IRN: 'ir', MAR: 'ma', TUN: 'tn',
  EGY: 'eg', ALG: 'dz', SEN: 'sn', GHA: 'gh', NGA: 'ng', CIV: 'ci',
  CMR: 'cm', RSA: 'za', AUS: 'au', QAT: 'qa', KSA: 'sa', JOR: 'jo',
  IRQ: 'iq', UZB: 'uz', PAR: 'py', PER: 'pe', ECU: 'ec', CAN: 'ca',
  PAN: 'pa', HAI: 'ht', CUW: 'cw', CPV: 'cv', COD: 'cd', BIH: 'ba',
  CZE: 'cz', TUR: 'tr', NZL: 'nz', SVK: 'sk', SVN: 'si', HUN: 'hu',
  ROU: 'ro', BUL: 'bg', FIN: 'fi', ISL: 'is', VEN: 've', BOL: 'bo',
};

/** 自国監督の旗用に fifaCode -> ISO2 を解決。未知は null。 */
export function fifaToIsoLocal(fifa: string): string | null {
  return CODE_TO_ISO[fifa.toUpperCase()] ?? null;
}

/** `[[target|display]]` を記事タイトル(target)と表示名(display)に分解する。 */
export function linkParts(raw: string): {
  target: string | null;
  display: string;
} {
  const s = raw.trim();
  const m = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(s);
  if (m) return { target: m[1].trim(), display: (m[2] ?? m[1]).trim() };
  const clean = s.replace(/\[\[|\]\]/g, '').trim();
  return { target: null, display: clean };
}

/**
 * セクション wikitext から監督（Coach: 行）を抽出する。
 *
 * 旗テンプレートは新旧 2 形式を許容する:
 * - 旧: `Coach: {{flagicon|ITA}} [[Carlo Ancelotti]]`
 * - 新: `Coach: {{#invoke:flag|icon|GER}} [[Thomas Tuchel]]`（2026-06 時点の現行 wikitext）
 * - 旗なし（自国監督）: `Coach: [[Hajime Moriyasu]]`
 */
export function parseCoach(section: string): ParsedCoach | null {
  const m =
    /Coach:\s*(?:\{\{\s*(?:flagicon\s*\|\s*([A-Za-z]{3})\s*|#invoke:\s*flag\s*\|\s*icon\s*\|\s*([A-Za-z]{3})\s*(?:\|[^{}]*)?)\}\}\s*)?(\[\[[^\]]+\]\])/.exec(
      section,
    );
  if (!m) return null;
  const flagCode = m[1] ?? m[2] ?? null;
  const { target, display } = linkParts(m[3]);
  return {
    name: display,
    nameJa: null,
    flagCode: flagCode ? flagCode.toUpperCase() : null,
    link: target,
  };
}
