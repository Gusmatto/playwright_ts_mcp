import { randomUUID } from 'node:crypto';
import type { AccountData } from '../api/clients/api-client';

/** Unique per call, so parallel workers and reruns never collide. */
export function uniqueEmail(prefix = 'pw'): string {
  return `${prefix}.${randomUUID().slice(0, 12)}@example.com`;
}

export function buildAccount(overrides: Partial<AccountData> = {}): AccountData {
  return {
    name: 'Test User',
    email: uniqueEmail(),
    password: `Pw-${randomUUID().slice(0, 10)}`,
    title: 'Mr',
    birth_date: '15',
    birth_month: 'June',
    birth_year: '1990',
    firstname: 'Test',
    lastname: 'User',
    company: 'Test Co',
    address1: '1 Test Street',
    address2: 'Suite 2',
    country: 'Canada',
    zipcode: 'A1A1A1',
    state: 'Ontario',
    city: 'Toronto',
    mobile_number: '5551234567',
    ...overrides,
  };
}
