# AutomationExercise — API Test Plan

## Application Overview

API coverage for the public REST endpoints documented at
https://automationexercise.com/api_list, served from `https://automationexercise.com/api/`.
This plan covers the product catalog (`productsList`), product search (`searchProduct`),
login verification (`verifyLogin`), and the account lifecycle needed to seed and clean up
login tests (`createAccount`, `getUserDetailByEmail`, `deleteAccount`).
The web UI is out of scope; it is covered by `specs/product-search-cart-test-plan.md`.

## Scope

Implemented: scenarios 1 to 4 below.

Deliberately out of scope for now, and why: the brand catalog (same shape as the product
catalog, adds no new coverage); exhaustive negative matrices per endpoint (one representative
case per category is enough to prove the pattern); account update; and the cross-cutting
contract suite. Notes on the two authorization findings worth chasing are kept at the end.

## API Under Test

| # | Method | Path | Parameters | Documented `responseCode` |
|---|--------|------|-----------|---------------------------|
| 1 | GET | `/api/productsList` | — | 200 |
| 2 | POST | `/api/productsList` | — | 405 |
| 3 | POST | `/api/searchProduct` | `search_product` | 200 |
| 4 | POST | `/api/searchProduct` | — | 400 |
| 5 | POST | `/api/verifyLogin` | `email`, `password` | 200 |
| 6 | POST | `/api/verifyLogin` | `password` only | 400 |
| 7 | POST | `/api/verifyLogin` | invalid `email`, `password` | 404 |
| 8 | POST | `/api/createAccount` | 18 account fields | 201 |
| 9 | GET | `/api/getUserDetailByEmail` | `email` | 200 |
| 10 | DELETE | `/api/deleteAccount` | `email`, `password` | 200 |

## Conventions

- Tests are grouped by resource, one spec per resource under `tests/api/`.
- **The transport status code is not the API status code.** Every endpoint on this service
  answers `HTTP 200` — including the documented 400, 404, 405 and 201 cases — and carries
  the real outcome in the JSON body field `responseCode`. Assert `responseCode` from the
  parsed body; assert the transport status separately and only as `200`. A test that
  asserts `expect(response.status()).toBe(400)` will fail against a correct server.
- Responses are served with `Content-Type: text/html; charset=utf-8` despite the body being
  JSON. Read the body as text and parse it explicitly, so a future content-type change
  produces a clear failure rather than a confusing one.
- Request bodies use form encoding, not JSON. `getUserDetailByEmail` takes its `email` as a
  query string parameter.
- Account-creating tests generate a unique email per run from a shared helper, never a
  hard-coded address, so parallel runs and reruns do not collide.
- Every test that creates an account deletes it in teardown, including when the test fails.
- Assert schema shape and field relationships, not catalog values. Product names, prices and
  the number of brands change; the presence and type of `id`, `name`, `price`, `brand` and
  `category` does not.
- No fixed timeouts. No dependency on execution order between specs.

## Test Scenarios

### 1. Products Catalog

**File:** `tests/api/products-list.spec.ts`

#### 1.1. Get all products list

**Steps:**
  1. Send `GET /api/productsList`.
     - expect: The transport status is 200.
     - expect: The body parses as JSON.
     - expect: `responseCode` equals 200.
     - expect: `products` is an array with at least one entry.

#### 1.2. Product entry schema

**Steps:**
  1. Send `GET /api/productsList` and inspect every entry in `products`.
     - expect: Each entry has `id` (number), `name` (non-empty string), `price`
       (non-empty string), `brand` (string).
     - expect: Each entry has `category.category` and `category.usertype.usertype`,
       both non-empty strings.
     - expect: `price` matches the documented currency format (`Rs. <digits>`).
     - expect: All `id` values are unique across the list.

#### 1.3. POST to products list is rejected

**Steps:**
  1. Send `POST /api/productsList` with no body.
     - expect: The transport status is 200.
     - expect: `responseCode` equals 405.
     - expect: `message` equals "This request method is not supported."
     - expect: The body does not contain a `products` field.

### 2. Product Search

**File:** `tests/api/search-product.spec.ts`

#### 2.1. Search for a product by name

**Steps:**
  1. Send `POST /api/searchProduct` with `search_product` set to the configured search term.
     - expect: The transport status is 200.
     - expect: `responseCode` equals 200.
     - expect: `products` is an array with at least one entry.
     - expect: Every returned entry satisfies the same schema as scenario 1.2.
     - expect: At least one returned `name` contains the search term, case-insensitively.

#### 2.2. Search is case-insensitive and matches partial names

Data-driven: run for each variant of the configured term (exact name, uppercase,
lowercase, first word only).

**Steps:**
  1. Search using the variant.
     - expect: `responseCode` equals 200.
     - expect: The target product is present in `products`.
  2. Compare the result sets of the variants.
     - expect: The set of returned product ids is identical across all variants.

#### 2.3. Search with no matching product

**Steps:**
  1. Search for the configured no-match term.
     - expect: `responseCode` equals 200.
     - expect: `products` is an empty array, not a missing field and not `null`.

#### 2.4. Search without the search_product parameter

**Steps:**
  1. Send `POST /api/searchProduct` with an empty body.
     - expect: The transport status is 200.
     - expect: `responseCode` equals 400.
     - expect: `message` equals
       "Bad request, search_product parameter is missing in POST request."
     - expect: The body does not contain a `products` field.

#### 2.5. Search with injection-shaped input

Data-driven: run for a SQL-shaped term (`' OR 1=1 --`) and an HTML-shaped term
(`<script>alert(1)</script>`).

**Steps:**
  1. Send the search request with the value.
     - expect: The response body parses as JSON.
     - expect: `responseCode` is 200 or 400, never 500.
     - expect: If `products` is returned, it does not contain the entire catalog — an
       injection-shaped term must not widen the result set beyond a literal match.

### 3. Login Verification

**File:** `tests/api/verify-login.spec.ts`

**Setup:** create an account via `POST /api/createAccount` with a generated unique email and
a known password. **Teardown:** delete that account via `DELETE /api/deleteAccount`.

#### 3.1. Verify login with valid details

**Steps:**
  1. Send `POST /api/verifyLogin` with the seeded `email` and `password`.
     - expect: The transport status is 200.
     - expect: `responseCode` equals 200.
     - expect: `message` equals "User exists!".

#### 3.2. Verify login with invalid details

Data-driven: run for an unregistered email with any password, and for the seeded
email with a wrong password.

**Steps:**
  1. Send `POST /api/verifyLogin` with the credential pair.
     - expect: `responseCode` equals 404.
     - expect: `message` equals "User not found!".
     - expect: The response body contains no account details and no password field.

  > Both cases must return the same 404 body. A response that distinguishes "unknown email"
  > from "wrong password" leaks account existence and should be reported.

#### 3.3. Verify login without the email parameter

**Steps:**
  1. Send `POST /api/verifyLogin` with only `password`.
     - expect: `responseCode` equals 400.
     - expect: `message` equals
       "Bad request, email or password parameter is missing in POST request."

### 4. User Account Lifecycle

**File:** `tests/api/user-account.spec.ts`

Each test generates its own unique email and deletes the account it created in teardown,
so tests in this group remain independent and can run in parallel.

#### 4.1. Create a user account

**Steps:**
  1. Send `POST /api/createAccount` with all documented fields populated from a shared
     account-data builder using a generated unique email.
     - expect: The transport status is 200.
     - expect: `responseCode` equals 201.
     - expect: `message` equals "User created!".
  2. Send `POST /api/verifyLogin` with the new email and password.
     - expect: `responseCode` equals 200 — confirming the account is usable, not just reported.

#### 4.2. Created account details are persisted correctly

**Steps:**
  1. Create an account with known values for every field.
  2. Send `GET /api/getUserDetailByEmail` with the new email.
     - expect: `responseCode` equals 200.
     - expect: `user.email` equals the submitted email.
     - expect: `user.name`, `user.first_name`, `user.last_name`, `user.city` and
       `user.country` match the submitted values.
     - expect: The response contains no `password` field in any form.

  > The password-absence assertion is the security check in this group: a read endpoint
  > addressed only by email must never return credential material.

#### 4.3. Get user detail for an unregistered email

**Steps:**
  1. Send `GET /api/getUserDetailByEmail` with a generated email that was never registered.
     - expect: `responseCode` equals 404.
     - expect: `message` equals
       "Account not found with this email, try another email!".
     - expect: The body does not contain a `user` field.

#### 4.4. Delete a user account

**Steps:**
  1. Create an account.
  2. Send `DELETE /api/deleteAccount` with that `email` and `password`.
     - expect: `responseCode` equals 200.
     - expect: `message` equals "Account deleted!".
  3. Send `GET /api/getUserDetailByEmail` for that email.
     - expect: `responseCode` equals 404.
  4. Send `POST /api/verifyLogin` with the deleted credentials.
     - expect: `responseCode` equals 404.

## Findings to chase

Two authorization behaviours worth verifying against this API, not yet automated:

- `DELETE /api/deleteAccount` with a correct email and an incorrect password. If the account
  is deleted, any known email can be removed by anyone — a blocking defect.
- `POST /api/verifyLogin` must return an identical 404 body for an unknown email and for a
  wrong password. Distinguishing them leaks account existence.

### 5. Authenticated Session Setup

**File:** `tests/auth.setup.ts`

The API's `verifyLogin` endpoint only validates credentials — it issues no token and no
session cookie — so an authenticated state cannot be obtained from the API alone. Verified
against the live site: login is a Django form `POST /login` carrying `csrfmiddlewaretoken`,
`email` and `password` as form data, answering `302` with a redirect to `/`. UI tests that
need an authenticated state therefore log in once in a setup project and reuse the saved
`storageState`, rather than logging in through the UI in every test.

The account itself is seeded through the API, so no test depends on a pre-existing user.

**Notes:**
- The CSRF token in the form and the `csrftoken` cookie must come from the same request
  context; fetching them in separate contexts produces a token mismatch.
- Django rejects cross-origin POSTs over HTTPS without a `Referer` header. A `403` on the
  login POST points here, not