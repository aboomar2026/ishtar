import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogImportSchema } from '../src/features/admin/products/catalog-import.validation';
const product = {
  name: 'لوشن فازلين Soothing Hydration', slug: 'vaseline-soothing-hydration-600ml',
  description: 'لوشن الجسم فازلين بعبوة مضخة سعة 600 مل.', basePrice: 35, quantity: 8, sku: 'IS-P005',
  category: { name: 'العناية بالجسم', slug: 'body-care', description: 'مستحضرات العناية بالجسم واللوشن والكريمات.' },
  images: [{ mime: 'image/jpeg', base64: 'a'.repeat(128), alt: 'لوشن فازلين الأخضر' }]
};
test('requires a real product image, positive selling price and integer inventory', () => {
  assert.equal(catalogImportSchema.safeParse(product).success, true);
  for (const patch of [{images: []}, {basePrice: 0}, {quantity: -1}, {quantity: 1.5}, {sku: '../bad'}, {images: [{...product.images[0], base64:'https://example.com/image.jpg'}]}]) {
    assert.equal(catalogImportSchema.safeParse({...product, ...patch}).success, false);
  }
});
test('accepts Arabic slugs and rejects oversized image data', () => {
  assert.equal(catalogImportSchema.safeParse({...product,slug:'لوشن-فازلين'}).success,true);
  assert.equal(catalogImportSchema.safeParse({...product,images:[{...product.images[0],base64:'a'.repeat(4_000_001)}]}).success,false);
});
