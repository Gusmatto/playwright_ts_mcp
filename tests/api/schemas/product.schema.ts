import { z } from 'zod';

/** One entry of `products` in productsList / searchProduct. Format only, never catalog values. */
export const productSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  price: z.string().regex(/^Rs\.\s*\d+$/, 'expected "Rs. <digits>"'),
  brand: z.string(),
  category: z.object({
    category: z.string().min(1),
    usertype: z.object({ usertype: z.string().min(1) }),
  }),
});

export const productListSchema = z
  .object({
    responseCode: z.literal(200),
    products: z.array(productSchema),
  })
  .refine((body) => new Set(body.products.map((p) => p.id)).size === body.products.length, {
    message: 'product ids are not unique',
    path: ['products'],
  });

export type Product = z.infer<typeof productSchema>;
