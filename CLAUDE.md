# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Playwright + TypeScript tests for automationexercise.com (a live third-party site), built as an agentic-workflow experiment: planner → human review → generator → type-check hook → human review. The README documents what the agents got wrong; read it before changing the workflow.

## Commands

```bash
npm install
npm test                                           # everything
npm run test:api                                   # API tests, no browser
npm run test:ui                                    # UI tests, Chromium only; also runs setup + cleanup
npm run typecheck                                  # tsc --noEmit (what the hook and CI run)
npx playwright test tests/api/verify-login.spec.ts -g "test title"   # single test
```

`BASE_URL` (env var or optional `.env`, see `.env.example`) selects the origin under test; default is production. Running a single UI test by file still triggers the `setup` project through the `ui` project dependency.

## Architecture

- `playwright.config.ts` defines four projects: `api`; `setup` (`auth.setup.ts`, with `cleanup` as its teardown); `ui` (depends on `setup`, uses the saved `storageState`); `cleanup` (`auth.teardown.ts`). Reporters differ in CI: list + html + json (the json feeds the job summary), and retries are 1.
- `tests/config/env.ts` — the only place the origin is defined (`BASE_URL`, `API_URL`). Specs and page objects use relative paths; never hardcode the site URL.
- `tests/auth.setup.ts` — creates an account via the API, logs in through the Django form (CSRF token and cookie from the same request context, `Referer` header required), saves `playwright/.auth/user.json`. The account deliberately does not use the `account` fixture (that would delete it before the UI project runs); credentials go to `playwright/.auth/account.json` so `auth.teardown.ts` can delete it. `verifyLogin` issues no session, so the session cannot come from the API alone.
- `tests/ui/pages/*.page.ts` — page objects. All locators live here, never in specs.
- `tests/fixtures/test.ts` — page-object fixtures for UI specs. `tests/fixtures/api.ts` — `api` (ApiClient) and `account` (a created account, deleted in a `finally`) for API specs.
- `tests/api/clients/api-client.ts` — `ApiClient` over `APIRequestContext`. Every endpoint returns HTTP 200 and carries the real outcome in `responseCode` in the body, so assert on `responseCode`, not `status`. Bodies come back as `text/html`; the client parses them and throws a descriptive error on non-JSON.
- `tests/api/schemas/` — Zod schemas. The user schema is `.strict()` on purpose: an extra field (e.g. a leaked password) fails it. Note the read model (`birth_day`, `first_name`) differs from the create request (`birth_date`, `firstname`).
- `tests/test-data/` — search terms, `buildAccount()`, `uniqueEmail()` (random UUID per call, safe for parallel workers).
- `specs/` — markdown test plans (agent output, human-revised); `specs/api-test-plan.md` is the plan the API specs implement.
- `.claude/agents/` — planner, generator, healer definitions. `.claude/skills/playwright-test-conventions/` — conventions; load it when creating or editing specs or page objects. `.mcp.json` configures the Playwright MCP server.

## Conventions and gotchas

- Test-writing rules (locators, assertions, waiting, test data) live in the
  `playwright-test-conventions` skill; don't duplicate them here.
- Ad iframes make `waitUntil: 'load'` unreliable on this site; wait on a
  specific condition instead.
- One spec per flow with shared fixtures, not one file per test (overrides the
  generator's default).
- A `PostToolUse` hook (`.claude/settings.json`) runs `tsc --noEmit` after `.ts`
  edits and blocks on errors. It requires `jq` (`brew install jq`). It checks
  compilation only; running tests is a separate explicit step.
- The healer must not run unattended in CI.
- CI (`.github/workflows/playwright.yml`): the `api` job blocks; the `ui` job is `continue-on-error` on purpose (live third-party site) and should become blocking once its flaky rate is low. Both write a pass/fail/flaky table to the job summary via `.github/scripts/job-summary.sh` and upload the report and traces on failure.
- The live API occasionally answers with an HTML page instead of JSON; a CI retry absorbs it. Don't loosen assertions to hide it.
