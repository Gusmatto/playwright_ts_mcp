import { test as base } from '@playwright/test';
import { ApiClient, type AccountData } from '../api/clients/api-client';
import { buildAccount } from '../test-data/account';

type Fixtures = {
  api: ApiClient;
  /** A freshly created account, deleted in teardown even when the test fails. */
  account: AccountData;
};

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    await use(new ApiClient(request));
  },
  account: async ({ api }, use) => {
    const data = buildAccount();
    const created = await api.createAccount(data);
    if (created.body.responseCode !== 201) {
      throw new Error(`account fixture: createAccount failed: ${JSON.stringify(created.body)}`);
    }
    try {
      await use(data);
    } finally {
      await api.deleteAccount(data.email, data.password);
    }
  },
});

export { expect } from '@playwright/test';
