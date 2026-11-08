import type { APIRequestContext } from '@playwright/test';

import { API_URL } from '../../config/env';

export const API_BASE_URL = API_URL;

/**
 * Every endpoint answers HTTP 200 and carries the real outcome in `responseCode`.
 * Endpoint-specific fields (`products`, `user`, ...) are validated by the schemas,
 * not typed here.
 */
export type ApiBody = { responseCode: number; message?: string } & Record<string, unknown>;

export interface ApiResponse {
  /** Transport status. Expected to be 200 even for documented 4xx outcomes. */
  status: number;
  body: ApiBody;
}

/** Form fields accepted by POST /api/createAccount. */
export interface AccountData {
  name: string;
  email: string;
  password: string;
  title: 'Mr' | 'Mrs' | 'Miss';
  birth_date: string;
  birth_month: string;
  birth_year: string;
  firstname: string;
  lastname: string;
  company: string;
  address1: string;
  address2: string;
  country: string;
  zipcode: string;
  state: string;
  city: string;
  mobile_number: string;
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface SendOptions {
  form?: Record<string, string>;
  params?: Record<string, string>;
}

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async getProducts(): Promise<ApiResponse> {
    return this.send('GET', 'productsList');
  }

  /** Unsupported method — documented to answer `responseCode` 405. */
  async postProducts(): Promise<ApiResponse> {
    return this.send('POST', 'productsList');
  }

  /** Pass `undefined` to omit the `search_product` parameter entirely. */
  async searchProduct(term: string | undefined): Promise<ApiResponse> {
    return this.send('POST', 'searchProduct', {
      form: term === undefined ? undefined : { search_product: term },
    });
  }

  /** Pass `undefined` for either field to omit it from the request. */
  async verifyLogin(email: string | undefined, password: string | undefined): Promise<ApiResponse> {
    return this.send('POST', 'verifyLogin', { form: definedOnly({ email, password }) });
  }

  async createAccount(data: AccountData): Promise<ApiResponse> {
    return this.send('POST', 'createAccount', { form: { ...data } });
  }

  async getUserByEmail(email: string): Promise<ApiResponse> {
    return this.send('GET', 'getUserDetailByEmail', { params: { email } });
  }

  async deleteAccount(email: string, password: string): Promise<ApiResponse> {
    return this.send('DELETE', 'deleteAccount', { form: { email, password } });
  }

  private async send(method: Method, path: string, options: SendOptions = {}): Promise<ApiResponse> {
    const response = await this.request.fetch(`${API_BASE_URL}/${path}`, {
      method,
      form: options.form,
      params: options.params,
    });
    const text = await response.text();
    return { status: response.status(), body: parseBody(method, path, response.status(), text) };
  }
}

/**
 * The service sends JSON with `Content-Type: text/html`, so the body is parsed explicitly.
 * A non-JSON body or a missing `responseCode` fails here with the request in the message,
 * rather than as a confusing `undefined` assertion inside a spec.
 */
function parseBody(method: Method, path: string, status: number, text: string): ApiBody {
  const context = `${method} /api/${path} (HTTP ${status})`;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${context} returned a non-JSON body: ${text.slice(0, 200)}`);
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { responseCode?: unknown }).responseCode !== 'number'
  ) {
    throw new Error(`${context} returned JSON without a numeric responseCode: ${text.slice(0, 200)}`);
  }
  return parsed as ApiBody;
}

function definedOnly(fields: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}
