import { existsSync } from 'node:fs';

// Optional local overrides; real environment variables (e.g. CI) take precedence.
if (existsSync('.env')) process.loadEnvFile('.env');

/** Origin under test, no trailing slash. Everything else derives from this. */
export const BASE_URL = (process.env.BASE_URL ?? 'https://automationexercise.com').replace(/\/+$/, '');
export const API_URL = `${BASE_URL}/api`;
