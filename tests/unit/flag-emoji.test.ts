import { describe, it, expect } from 'vitest';
import { flagEmojiToISO2 } from '@/lib/flag-emoji';

describe('flagEmojiToISO2', () => {
  it('カナダ 🇨🇦 → ca', () => {
    expect(flagEmojiToISO2('🇨🇦')).toBe('ca');
  });

  it('ブラジル 🇧🇷 → br', () => {
    expect(flagEmojiToISO2('🇧🇷')).toBe('br');
  });

  it('南アフリカ 🇿🇦 → za', () => {
    expect(flagEmojiToISO2('🇿🇦')).toBe('za');
  });

  it('日本 🇯🇵 → jp', () => {
    expect(flagEmojiToISO2('🇯🇵')).toBe('jp');
  });

  it('ドイツ 🇩🇪 → de', () => {
    expect(flagEmojiToISO2('🇩🇪')).toBe('de');
  });

  it('オランダ 🇳🇱 → nl', () => {
    expect(flagEmojiToISO2('🇳🇱')).toBe('nl');
  });

  it('イングランド 🏴󠁧󠁢󠁥󠁮󠁧󁿢 → gb-eng', () => {
    expect(flagEmojiToISO2('🏴󠁧󠁢󠁥󠁮󠁧󁿢')).toBe('gb-eng');
  });

  it('ウェールズ 🏴󠁧󠁢󠁷󠁬󠁳󠁿 → gb-wls', () => {
    expect(flagEmojiToISO2('🏴󠁧󠁢󠁷󠁬󠁳󠁿')).toBe('gb-wls');
  });

  it('空文字は空文字を返す', () => {
    expect(flagEmojiToISO2('')).toBe('');
  });
});
