---
name: playwright-test-conventions
description: Conventions for writing Playwright tests in this repo. Use when
  creating, editing or reviewing any test spec or page object.
---

## Locators
- Use `getByRole` first, then `getByLabel`, `getByPlaceholder`, `getByText`.
- `getByTestId` only when nothing semantic is available.
- Never use CSS or XPath selectors tied to DOM structure.

## Page objects
- One page object per page, in `pages/`, exported as a class taking `page` in the constructor.
- Methods express business actions (`searchFor`, `addToCart`), not UI mechanics.
- Locators are defined in the page object, never inline in a spec.
- Specs contain no raw `page.` calls other than through a page object or fixture.

## Assertions
- Assert relationships, not catalog values: carry a value captured earlier in the flow
  and compare it, or compute it (total = unit price x quantity).
- Never assert a hardcoded price, brand, id or category that can change in the app.
- For fields that only need to exist, assert visible and non-empty.
- Every test has at least one assertion that verifies observable behavior,
  not that a click happened.
- No assertion containing "or" — if the expected behavior is unclear, ask instead of guessing.

## Waiting
- Never use `waitForTimeout` or any fixed delay.
- Wait on the condition: web-first assertions, `waitForResponse`, `expect.poll`.

## Test data
- Search terms and other inputs come from a shared constant or fixture, never inline literals
  repeated across tests.

## Setup
- Shared setup goes in a fixture or helper, never repeated as UI steps in each test.
- Prefer reaching a state via API or fixture over clicking through the UI.

## Structure
- Tests are independent and can run in any order or in parallel.
- Data-driven cases loop over an array; never copy a test block with a changed value.