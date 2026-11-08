import { z } from 'zod';

/**
 * `.strict()` so any unexpected field (a `password`, a hash, a token) fails the schema.
 * Note the read model differs from the create request: `birth_day` / `first_name`
 * here versus `birth_date` / `firstname` on createAccount.
 */
export const userDetailSchema = z.object({
  responseCode: z.literal(200),
  user: z
    .object({
      id: z.number().int(),
      name: z.string(),
      email: z.string(),
      title: z.string(),
      birth_day: z.string(),
      birth_month: z.string(),
      birth_year: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      company: z.string(),
      address1: z.string(),
      address2: z.string(),
      country: z.string(),
      state: z.string(),
      city: z.string(),
      zipcode: z.string(),
    })
    .strict(),
});
