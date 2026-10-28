import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { CatalogImage } from '../src/components/CatalogImage';
import { PRODUCT_CARD_IMAGE } from '../src/lib/cloudinary-image';

test('failed responsive images clear srcset/sizes; changed sources can recover', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const source = 'https://res.cloudinary.com/demo/image/upload/v1/bag.jpg';
  const props = { src: source, transform: { ...PRODUCT_CARD_IMAGE, crop: 'fit' as const }, widths: [320, 480, 800], sizes: '230px', alt: 'حقيبة' };
  let renderer!: ReturnType<typeof create>;
  await act(async () => { renderer = create(<CatalogImage {...props} />); });
  let image = renderer.root.findByType('img');
  assert.match(image.props.srcSet, /320w/);
  assert.equal(image.props.alt, 'حقيبة');
  await act(async () => image.props.onError());
  image = renderer.root.findByType('img');
  assert.equal(image.props.src, '/mock-products/gift-box.svg');
  assert.equal(image.props.srcSet, undefined);
  assert.equal(image.props.sizes, undefined);
  await act(async () => image.props.onError());
  assert.equal(renderer.root.findByType('img').props.src, '/mock-products/gift-box.svg');
  await act(async () => renderer.update(<CatalogImage {...props} src={source.replace('v1', 'v2')} />));
  assert.match(renderer.root.findByType('img').props.src, /v2/);
  assert.match(renderer.root.findByType('img').props.srcSet, /320w/);
  await act(async () => renderer.unmount());
});
