import { mkdirSync, writeFileSync } from 'node:fs';
import { test as setup, expect } from './fixtures/api';
import { AUTH_ACCOUNT_FILE, AUTH_STATE_FILE } from './auth-paths';
import { BASE_URL } from './config/env';
import { buildAccount } from './test-data/account';


/**
 * verifyLogin issues no session, so the account is seeded through the API and the
 * session comes from the Django login form, once, saved as storageState.
 * The account must outlive this test (the UI project uses it), so it is not created
 * through the `account` fixture; auth.teardown.ts deletes it after the UI project.
 */
setup('seed account and save authenticated session', async ({ api, request }) => {
  const account = buildAccount();
  const created = await api.createAccount(account);
  expect(created.body.responseCode, 'account created').toBe(201);

  // Record it before anything else can fail, so teardown can always clean up.
  mkdirSync('playwright/.auth', { recursive: true });
  writeFileSync(AUTH_ACCOUNT_FILE, JSON.stringify({ name: account.name, email: account.email, password: account.password }));

  // The token and the csrftoken cookie must come from the same request context.
  const loginPage = await request.get(`${BASE_URL}/login`);
  const token = /name="csrfmiddlewaretoken" value="([^"]+)"/.exec(await loginPage.text())?.[1];
  expect(token, 'csrf token present on /login').toBeTruthy();

  const login = await request.post(`${BASE_URL}/login`, {
    form: { csrfmiddlewaretoken: token!, email: account.email, password: account.password },
    headers: { Referer: `${BASE_URL}/login` }, // Django rejects cross-origin HTTPS POSTs without it
    maxRedirects: 0,
  });
  expect(login.status(), 'successful login redirects').toBe(302);

  await request.storageState({ path: AUTH_STATE_FILE });
});
