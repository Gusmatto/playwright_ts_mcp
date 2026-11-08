# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Playwright + TypeScript tests for automationexercise.com (a live third-party site), built as an agentic-workflow experiment: planner → human review → generator → type-check hook → human review. The README documents what the agents got wrong; read it before changing the workflow.

## Commands

There are no npm scripts; use Playwright directly.

```bash
npm install
npx playwright test                                # everything
npx playwright test --project=ui                   # browser tests (Chromium only)
npx playwright test --project=api                  # API tests, no browser
npx playwright test tests/ui/product-search-cart.spec.ts -g "test title"   # single test
npx tsc --noEmit                                   # type check (what the hook runs)
```

## Architecture

- `playwright.config.ts` defines three projects: `api`, `setup` (`auth.setup.ts`), `ui`. The `setup` dependency and `storageState` for `ui` are currently commented out; `auth.setup.ts` does not exist yet.
- `tests/ui/pages/*.page.ts` — page objects. All locators live here, never in specs.
- `tests/fixtures/test.ts` — extends Playwright's `test` with page-object fixtures; UI specs should import `test` from here, not `@playwright/test`.
- `tests/api/clients/api-client.ts` — `ApiClient` over `APIRequestContext`. Every endpoint returns HTTP 200 and carries the real outcome in `responseCode` in the body, so assert on `responseCode`, not `status`. Schemas (response shape validation) are intended to live in `tests/api/schemas/`.
- `tests/test-data/` — inputs and builders; no repeated inline literals in specs.
- `specs/` — markdown test plans (agent output, human-revised). `specs/api-test-plan.md` is the plan for the not-yet-written API specs.
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
- CI is `.github/workflows/playwright.yml`.
