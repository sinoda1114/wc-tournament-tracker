/**
 * 旗絵文字 → 小文字 ISO 3166-1 alpha-2 コード変換（flagcdn.com URL 用）。
 * 🇨🇦 → "ca", 🇧🇷 → "br"
 * サブディビジョン旗 (🏴󠁧󠁢󠁥󠁮󠁧󁿢 等) は Regional Indicator を含まないため "" を返す。
 */
export function flagEmojiToISO2(emoji: string): string {
  return [...emoji]
    .map((c) => c.codePointAt(0) ?? 0)
    .filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)
    .map((cp) => String.fromCharCode(cp - 0x1f1e6 + 65))
    .join('')
    .toLowerCase();
}
