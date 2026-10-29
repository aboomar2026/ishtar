import { describe, expect, it } from 'vitest';
import { ishtarDisplayCopy } from '@/lib/ishtar-display-copy';

describe('legacy banner brand sanitization', () => {
  it('replaces obsolete Arabic and English store names', () => {
    expect(ishtarDisplayCopy('جمالك يبدأ من سعد سنتر')).toBe('جمالك يبدأ من عشتار');
    expect(ishtarDisplayCopy('SAAD CENTER')).toBe('ISHTAR');
    expect(ishtarDisplayCopy('باب الحارة')).toBe('عشتار');
    expect(ishtarDisplayCopy('Bab Al Hara')).toBe('ISHTAR');
  });
  it('leaves regular copy untouched', () => {
    expect(ishtarDisplayCopy('جمالك يبدأ من عشتار')).toBe('جمالك يبدأ من عشتار');
    expect(ishtarDisplayCopy(null)).toBe('');
  });
});
