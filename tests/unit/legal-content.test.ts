import { describe, expect, it } from 'vitest';

import type { Block, LegalSectionsDoc, Run } from '@/app/(legal)/legalShared';
import { PRIVACY_CONTENT } from '@/app/(legal)/privacy/content';
import { TERMS_CONTENT } from '@/app/(legal)/terms/content';
import { TOKUSHOHO_CONTENT } from '@/app/(legal)/tokushoho/content';

const LANGS = ['en', 'es', 'pt', 'zh'] as const;
const WIKIPEDIA = 'https://www.wikipedia.org/';
const CC_BY_SA = 'https://creativecommons.org/licenses/by-sa/4.0/';

function runHrefs(runs: Run[]): string[] {
  const hrefs: string[] = [];
  for (const run of runs) {
    if (typeof run === 'string') continue;
    if ('link' in run) hrefs.push(run.link.href);
    else if ('ext' in run) hrefs.push(run.ext.href);
  }
  return hrefs;
}

function sectionHrefs(blocks: Block[]): string[] {
  return blocks.flatMap((block) =>
    'p' in block ? runHrefs(block.p) : block.ul.flatMap((item) => runHrefs(item)),
  );
}

function docHrefs(doc: LegalSectionsDoc): string[] {
  return doc.sections.flatMap((s) => sectionHrefs(s.blocks));
}

describe('legal pages i18n content (T-114)', () => {
  it('terms/privacy は4言語そろい、共通メタが空でない', () => {
    for (const lang of LANGS) {
      for (const doc of [TERMS_CONTENT[lang], PRIVACY_CONTENT[lang]]) {
        expect(doc.title.length).toBeGreaterThan(0);
        expect(doc.updated.length).toBeGreaterThan(0);
        expect(doc.referenceNote.length).toBeGreaterThan(0);
        expect(doc.backLabel.length).toBeGreaterThan(0);
        expect(doc.related.length).toBeGreaterThan(0);
        expect(doc.sections.length).toBeGreaterThan(0);
        for (const section of doc.sections) {
          expect(section.heading.length).toBeGreaterThan(0);
          expect(section.blocks.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('terms は14条、privacy は8節', () => {
    for (const lang of LANGS) {
      expect(TERMS_CONTENT[lang].sections).toHaveLength(14);
      expect(PRIVACY_CONTENT[lang].sections).toHaveLength(8);
    }
  });

  it('tokushoho は4言語そろい、11項目で各項目に label/value がある', () => {
    for (const lang of LANGS) {
      const doc = TOKUSHOHO_CONTENT[lang];
      expect(doc.referenceNote.length).toBeGreaterThan(0);
      expect(doc.items).toHaveLength(11);
      for (const item of doc.items) {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.value.length).toBeGreaterThan(0);
      }
    }
  });

  it('【ライセンス義務】terms 第6条の CC BY-SA / Wikipedia 外部リンクが全言語で保持される', () => {
    for (const lang of LANGS) {
      const hrefs = docHrefs(TERMS_CONTENT[lang]);
      expect(hrefs).toContain(WIKIPEDIA);
      expect(hrefs).toContain(CC_BY_SA);
    }
  });

  it('内部リンクの遷移先は既存の法務ルートに限られる', () => {
    const allowed = new Set(['/terms', '/privacy', '/tokushoho']);
    for (const lang of LANGS) {
      const internal = [...docHrefs(TERMS_CONTENT[lang]), ...docHrefs(PRIVACY_CONTENT[lang])].filter(
        (h) => h.startsWith('/'),
      );
      for (const href of internal) {
        expect(allowed.has(href)).toBe(true);
      }
    }
  });

  it('tokushoho の参考訳免責に日本法準拠の注記が含まれる', () => {
    expect(TOKUSHOHO_CONTENT.en.referenceNote).toContain('Specified Commercial Transactions');
    expect(TOKUSHOHO_CONTENT.zh.referenceNote).toContain('特定商取引法');
  });
});
