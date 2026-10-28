import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { whatsappHref } from '../src/lib/whatsapp';
import { WhatsAppContact } from '../src/components/WhatsAppContact';
import { ishtarBrand } from '../src/config/brands/ishtar';

test('confirmed international number produces encoded click-to-chat links', () => {
  assert.equal(ishtarBrand.contact.whatsappNumber, '970598079482');
  const link = new URL(whatsappHref('+970 598 079 482', { kind: 'order', orderNumber: 'IS-42 & 7' })!);
  assert.equal(link.origin + link.pathname, 'https://wa.me/970598079482');
  assert.equal(link.searchParams.get('text'), 'مرحباً، أود الاستفسار عن طلبي رقم: IS-42 & 7');
  for (const number of ['', 'abc', '970/598079482', '00000']) assert.equal(whatsappHref(number), undefined);
});

test('product inquiry strips URL credentials, query and fragment; cart discloses no line or customer data', () => {
  const link = whatsappHref('970598079482', { kind:'product', name:'حقيبة & ورد', sku:'B-1', url:'https://user:secret@shop.example/product/bag?phone=123#token' })!;
  const text = new URL(link).searchParams.get('text')!;
  assert.match(text, /حقيبة & ورد/); assert.match(text, /B-1/);
  assert.match(text, /https:\/\/shop.example\/product\/bag/);
  assert.doesNotMatch(text, /secret|phone|token|user/);
  assert.doesNotMatch(new URL(whatsappHref('970598079482',{ kind:'product', name:'منتج', url:'javascript:alert(1)' })!).searchParams.get('text')!, /javascript/);
  assert.equal(new URL(whatsappHref('970598079482',{ kind:'cart' })!).searchParams.get('text'), 'مرحباً، أحتاج مساعدة بخصوص سلة التسوق وإتمام الطلب.');
});

test('accessible contact is a plain external link without navigation interception or automatic sends', () => {
  const html = renderToStaticMarkup(<WhatsAppContact context={{ kind:'order', orderNumber:'IS-42' }} />);
  assert.match(html, /href="https:\/\/wa.me\/970598079482\?text=/);
  assert.match(html, /target="_blank"/); assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /aria-label="تواصلي معنا عبر واتساب \(يفتح في تبويب جديد\)"/);
  assert.doesNotMatch(html, /<script|<button/);
});
