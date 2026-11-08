import { test, expect } from '../fixtures/api';
import { buildAccount, uniqueEmail } from '../test-data/account';
import { userDetailSchema } from './schemas/user.schema';

test.describe('account lifecycle', () => {
  test('creates an account that can then log in', async ({ api }) => {
    const data = buildAccount();
    try {
      const created = await api.createAccount(data);
      expect(created.status).toBe(200);
      expect(created.body.responseCode).toBe(201);
      expect(created.body.message).toBe('User created!');

      const login = await api.verifyLogin(data.email, data.password);
      expect(login.body.responseCode).toBe(200);
    } finally {
      await api.deleteAccount(data.email, data.password);
    }
  });

  test('persists the submitted details and never returns a password', async ({ api, account }) => {
    const { body } = await api.getUserByEmail(account.email);

    // .strict() schema: any extra field, such as a password, fails here.
    const { user } = userDetailSchema.parse(body);
    expect(user).toMatchObject({
      email: account.email,
      name: account.name,
      first_name: account.firstname,
      last_name: account.lastname,
      city: account.city,
      country: account.country,
    });
    expect(JSON.stringify(body)).not.toContain(account.password);
  });

  test('returns 404 for an unregistered email', async ({ api }) => {
    const { body } = await api.getUserByEmail(uniqueEmail('ghost'));

    expect(body.responseCode).toBe(404);
    expect(body.message).toBe('Account not found with this email, try another email!');
    expect(body).not.toHaveProperty('user');
  });

  test('deletes an account', async ({ api }) => {
    const data = buildAccount();
    await api.createAccount(data);

    const deleted = await api.deleteAccount(data.email, data.password);
    expect(deleted.body.responseCode).toBe(200);
    expect(deleted.body.message).toBe('Account deleted!');

    expect((await api.getUserByEmail(data.email)).body.responseCode).toBe(404);
    expect((await api.verifyLogin(data.email, data.password)).body.responseCode).toBe(404);
  });

  // Authorization finding from specs/api-test-plan.md. Unknown for this API; see run results.
  test('does not delete an account when the password is wrong', async ({ api, account }) => {
    const attempt = await api.deleteAccount(account.email, `${account.password}-wrong`);

    expect(attempt.body.responseCode).not.toBe(200);
    expect((await api.getUserByEmail(account.email)).body.responseCode).toBe(200);
  });
});
