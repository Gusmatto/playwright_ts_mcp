import { test, expect } from '../fixtures/api';
import { productListSchema } from './schemas/product.schema';

test.describe('GET/POST /api/productsList', () => {
  test('returns the product list', async ({ api }) => {
    const { status, body } = await api.getProducts();

    expect(status).toBe(200);
    expect(body.responseCode).toBe(200);
    expect(Array.isArray(body.products)).toBe(true);
    expect((body.products as unknown[]).length).toBeGreaterThan(0);
  });

  test('every product entry matches the schema and ids are unique', async ({ api }) => {
    const { body } = await api.getProducts();

    const result = productListSchema.safeParse(body);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  test('POST is rejected with 405', async ({ api }) => {
    const { status, body } = await api.postProducts();

    expect(status).toBe(200);
    expect(body.responseCode).toBe(405);
    expect(body.message).toBe('This request method is not supported.');
    expect(body).not.toHaveProperty('products');
  });
});
