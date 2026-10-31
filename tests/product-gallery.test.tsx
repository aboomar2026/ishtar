import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { ProductMediaGallery } from '../src/components/ProductMediaGallery';
import { ProductImageViewer } from '../src/components/ProductImageViewer';
import { StorefrontProductLink } from '../src/components/admin/StorefrontProductLink';
import { lockBodyScroll } from '../src/components/dialog-scroll-lock';
import type { CatalogProductImage } from '../src/features/catalog/catalog.types';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const images: CatalogProductImage[] = [
  { id: 'detail', url: '/detail.jpg', alt: 'تفاصيل', sortOrder: 0, isPrimary: false },
  { id: 'primary', url: '/primary.jpg', alt: 'الأصلية', sortOrder: 1, isPrimary: true },
  { id: 'model', url: '/model.jpg', alt: 'على مودل — صورة توضيحية مولّدة', sortOrder: 2, isPrimary: false },
];

test('gallery opens any thumbnail, cycles only this product, handles keys/swipe/zoom and restores focus/scroll', async () => {
  const before = globalThis.document;
  let opened = 0, closed = 0, focused = 0;
  const body = { style: { overflow: 'auto' } };
  Object.assign(globalThis, { document: { body, activeElement: { isConnected: true, focus: () => focused++ } } });
  let view!: ReturnType<typeof create>;
  await act(async () => { view = create(<ProductMediaGallery images={images} title="قطعة" />, {
    createNodeMock: element => element.type === 'dialog' ? { showModal: () => opened++, close: () => closed++ } : null,
  }); });
  const button = (label: string) => view.root.findByProps({ 'aria-label': label });
  const current = () => view.root.findByType(ProductImageViewer);
  const active = () => current().props.images[current().props.index].id;
  const key = async (value: string) => act(async () => { view.root.findByType('dialog').props.onKeyDown({ key: value, stopPropagation() {}, preventDefault() {} }); });
  try {
    assert.equal(view.root.findByProps({ className: 'mediaMain' }).findByType('img').props.src, '/primary.jpg');
    await act(async () => button('فتح الصورة 3: على مودل — صورة توضيحية مولّدة').props.onClick());
    assert.equal(active(), 'model'); assert.equal(opened, 1); assert.equal(body.style.overflow, 'hidden');
    await act(async () => button('الصورة التالية').props.onClick());
    assert.equal(active(), 'primary');
    await key('ArrowRight'); assert.equal(active(), 'model');
    await key('Home'); assert.equal(active(), 'primary');
    const stage = () => view.root.findAllByType('div').find(el => el.props.className === 'imageViewerStage')!;
    await act(async () => { stage().props.onPointerDown({ isPrimary: true, pointerType: 'touch', clientX: 20, clientY: 20 }); stage().props.onPointerUp({ clientX: 120, clientY: 25 }); });
    assert.equal(active(), 'detail');
    const zoom = view.root.findAllByType('button').find(el => el.children.includes('تكبير التفاصيل'))!;
    await act(async () => zoom.props.onClick());
    assert.equal(view.root.findByProps({ className: 'imageViewerStage isZoomed' }).findByType('img').props.sizes, undefined); // Local URLs need no srcset.
    await key('End'); assert.equal(active(), 'model'); assert.ok(stage());
    assert.match(JSON.stringify(view.toJSON()), /قد يختلف شكل اللبس/);
    await key('Escape');
    assert.equal(view.root.findAllByType(ProductImageViewer).length, 0);
    assert.equal(body.style.overflow, 'auto'); assert.equal(closed, 1); assert.equal(focused, 1);
    await act(async () => { view.update(<ProductMediaGallery images={[]} title="فارغ" />); });
    assert.ok(view.root.findByProps({ className: 'mediaMain' }).findByType('img').props.src);
  } finally { await act(async () => view.unmount()); Object.assign(globalThis, { document: before }); }
});

test('nested scroll locks restore the original state even when parent unmounts first', () => {
  const before = globalThis.document;
  const body = { style: { overflow: 'auto' } };
  Object.assign(globalThis, { document: { body } });
  try {
    const parent = lockBodyScroll(), child = lockBodyScroll();
    parent(); assert.equal(body.style.overflow, 'hidden');
    child(); assert.equal(body.style.overflow, 'auto');
    child(); assert.equal(body.style.overflow, 'auto');
  } finally { Object.assign(globalThis, { document: before }); }
});

test('unpublished admin entries explain availability instead of linking to a public 404', async () => {
  let view!: ReturnType<typeof create>;
  await act(async () => { view = create(<StorefrontProductLink slug="draft" published={false} className="test" />); });
  try {
    assert.equal(view.root.findAllByType('a').length, 0);
    assert.match(JSON.stringify(view.toJSON()), /فعّل المنتج وتصنيفه/);
  } finally { await act(async () => view.unmount()); }
});
