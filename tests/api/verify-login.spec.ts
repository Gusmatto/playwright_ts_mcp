import { test, expect } from '../fixtures/api';
import { uniqueEmail } from '../test-data/account';

test.describe('POST /api/verifyLogin', () => {
  test('accepts valid credentials', async ({ api, account }) => {
    const { status, body } = await api.verifyLogin(account.email, account.password);

    expect(status).toBe(200);
    expect(body.responseCode).toBe(200);
    expect(body.message).toBe('User exists!');
  });

  test('rejects invalid credentials with an identical body for both causes', async ({ api, account }) => {
    const unknownEmail = await api.verifyLogin(uniqueEmail('ghost'), account.password);
    const wrongPassword = await api.verifyLogin(account.email, `${account.password}-wrong`);

    for (const { body } of [unknownEmail, wrongPassword]) {
      expect(body.responseCode).toBe(404);
      expect(body.message).toBe('User not found!');
      expect(body).not.toHaveProperty('user');
      expect(body).not.toHaveProperty('password');
    }
    // A response that tells the two causes apart leaks which emails are registered.
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  test('rejects a request without email', async ({ api, account }) => {
    const { body } = await api.verifyLogin(undefined, account.password);

    expect(body.responseCode).toBe(400);
    expect(body.message).toBe('Bad request, email or password parameter is missing in POST request.');
  });
});
