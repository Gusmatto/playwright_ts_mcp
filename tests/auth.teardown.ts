import { existsSync, readFileSync, rmSync } from 'node:fs';
import { test as teardown } from './fixtures/api';
import { AUTH_ACCOUNT_FILE, AUTH_STATE_FILE } from './auth-paths';

teardown('delete the seeded account', async ({ api }) => {
  if (existsSync(AUTH_ACCOUNT_FILE)) {
    const { email, password } = JSON.parse(readFileSync(AUTH_ACCOUNT_FILE, 'utf8'));
    await api.deleteAccount(email, password);
  }
  rmSync(AUTH_ACCOUNT_FILE, { force: true });
  rmSync(AUTH_STATE_FILE, { force: true });
});
