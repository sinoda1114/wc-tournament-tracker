/**
 * 旗絵文字 → 小文字 ISO コード変換（flagcdn.com URL 用）。
 * 🇨🇦 → "ca", 🇧🇷 → "br"
 * サブディビジョン旗 (🏴󠁧󠁢󠁥󠁮󠁧󁿢 等) はタグ文字から "gb-eng" 形式に変換する。
 */
export function flagEmojiToISO2(emoji: string): string {
  const cps = [...emoji].map((c) => c.codePointAt(0) ?? 0);

  // Regional Indicator flag (🇨🇦 等) — U+1F1E6..U+1F1FF の2文字
  const ri = cps.filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff);
  if (ri.length === 2) {
    return ri.map((cp) => String.fromCharCode(cp - 0x1f1e6 + 65)).join('').toLowerCase();
  }

  // Tag-sequence subdivision flag (🏴󠁧󠁢󠁥󠁮󠁧󁿢 等) — U+E0061..U+E007E がタグ文字
  // "gbeng" → "gb-eng" のように2文字の国コードの後にハイフンを挿入する
  const tags = cps.filter((cp) => cp >= 0xe0061 && cp <= 0xe007e);
  if (tags.length >= 3) {
    const str = tags.map((cp) => String.fromCharCode(cp - 0xe0060 + 0x60)).join('');
    return `${str.slice(0, 2)}-${str.slice(2)}`;
  }

  return '';
}
