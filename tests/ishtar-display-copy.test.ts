import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ishtarDisplayCopy } from '../src/lib/ishtar-display-copy';

test('replaces obsolete Arabic and English store names', () => {
  assert.equal(ishtarDisplayCopy('جمالك يبدأ من سعد سنتر'), 'جمالك يبدأ من عشتار');
  assert.equal(ishtarDisplayCopy('SAAD CENTER'), 'ISHTAR');
  assert.equal(ishtarDisplayCopy('باب الحارة'), 'عشتار');
  assert.equal(ishtarDisplayCopy('Bab Al Hara'), 'ISHTAR');
});

test('leaves regular copy intact', () => {
  assert.equal(ishtarDisplayCopy('جمالك يبدأ من عشتار'), 'جمالك يبدأ من عشتار');
  assert.equal(ishtarDisplayCopy(null), '');
});
