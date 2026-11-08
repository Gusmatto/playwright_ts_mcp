import { test, expect } from '../fixtures/api';
import { searchTerms } from '../test-data/product-search';
import { productListSchema, type Product } from './schemas/product.schema';

test.describe('POST /api/searchProduct', () => {
  test('finds a product by name', async ({ api }) => {
    const { status, body } = await api.searchProduct(searchTerms.productName);

    expect(status).toBe(200);
    expect(body.responseCode).toBe(200);
    const parsed = productListSchema.parse(body);
    expect(parsed.products.length).toBeGreaterThan(0);
    expect(
      parsed.products.some((p) => p.name.toLowerCase().includes(searchTerms.productName.toLowerCase())),
    ).toBe(true);
  });

  test('is case-insensitive and matches partial names', async ({ api }) => {
    const idSets: string[] = [];
    for (const variant of searchTerms.variants) {
      const { body } = await api.searchProduct(variant);
      expect(body.responseCode, `variant "${variant}"`).toBe(200);
      const products = productListSchema.parse(body).products;
      expect(
        products.some((p) => p.name === searchTerms.productName),
        `variant "${variant}" should include the target product`,
      ).toBe(true);
      idSets.push(ids(products));
    }
    // Case variants of the full name must return identical result sets.
    expect(idSets.slice(0, 3)).toEqual(Array(3).fill(idSets[0]));
  });

  test('returns an empty array when nothing matches', async ({ api }) => {
    const { body } = await api.searchProduct(searchTerms.noMatch);

    expect(body.responseCode).toBe(200);
    expect(body.products).toEqual([]);
  });

  test('rejects a request without search_product', async ({ api }) => {
    const { status, body } = await api.searchProduct(undefined);

    expect(status).toBe(200);
    expect(body.responseCode).toBe(400);
    expect(body.message).toBe('Bad request, search_product parameter is missing in POST request.');
    expect(body).not.toHaveProperty('products');
  });

  for (const term of searchTerms.injection) {
    test(`handles injection-shaped input safely: ${term}`, async ({ api }) => {
      const { body } = await api.searchProduct(term);
      const catalog = productListSchema.parse((await api.getProducts()).body).products;

      expect([200, 400]).toContain(body.responseCode);
      if (Array.isArray(body.products)) {
        expect(body.products.length).toBeLessThan(catalog.length);
      }
    });
  }
});

function ids(products: Product[]): string {
  return products
    .map((p) => p.id)
    .sort((a, b) => a - b)
    .join(',');
}
