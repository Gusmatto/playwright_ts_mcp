# playwright_ts_mcp

Playwright + TypeScript test automation for [automationexercise.com](https://www.automationexercise.com/),
built with an agentic workflow: Playwright MCP, Test Agents (planner, generator, healer),
a conventions skill, and a hook — with a human review gate at every step.

The point of this repo is not the test coverage. It's the workflow: what agents are good at,
where they fail, and what a human still has to do.

## Stack

- Playwright with TypeScript
- Playwright Test Agents (`npx playwright init-agents`)
- Playwright MCP server (`.mcp.json`)
- Zod for API response schemas
- Agent skill with team conventions (`.claude/skills/`)
- Claude Code hook gating agent turns on a type check of edited `.ts` files (`.claude/settings.json`)

## Running

```bash
npm install
npm test               # everything
npm run test:api       # API tests, no browser
npm run test:ui        # UI tests (also runs the setup and cleanup projects)
npm run typecheck
```

## Configuration

One setting: `BASE_URL`, the origin under test (default `https://automationexercise.com`,
no trailing slash). Set it as an environment variable, or copy `.env.example` to `.env` for
local use; real environment variables win. It drives Playwright's `baseURL` and the API URL,
so specs and page objects use relative paths. In CI, set the `BASE_URL` repository variable
to point the same suite at another environment.

There are no stored credentials. Every account is generated per run and deleted afterwards.

## Structure

```
specs/              test plans in markdown (agent output, human-revised)
tests/
  ui/
    pages/          page objects — locators live here, never in specs
    *.spec.ts
  api/
    clients/        request client: form encoding, response parsing
    schemas/        Zod schemas for response shape validation
    *.spec.ts       products, search, login, account lifecycle
  fixtures/         api.ts (api client, self-cleaning account) and test.ts (page objects)
  test-data/        search terms, account builder, unique emails
  config/env.ts     BASE_URL and API_URL
  auth.setup.ts     seeds an account via API, logs in once, saves the session
  auth.teardown.ts  deletes the seeded account after the UI project
.claude/
  agents/           planner, generator, healer definitions
  skills/           test conventions applied at generation time
  settings.json     PostToolUse hook
.github/
  workflows/        CI: API job (blocking), UI job (non-blocking)
  scripts/          job-summary.sh writes the pass/fail table to the job summary
```

Projects: `api` runs without a browser. `ui` depends on `setup`, reuses its saved
`storageState`, and `cleanup` runs after it as the setup project's teardown, including when
UI tests fail.

## Workflow

1. **Plan** — the Planner explores the app in a real browser and writes a markdown plan.
2. **Review** — I revise the plan before any code is generated. This step is not optional.
3. **Generate** — the Generator executes each step in a browser and writes the spec,
   with the conventions skill attached.
4. **Verify** — a hook type-checks the project after every agent edit to a `.ts` file. The
   agent cannot end its turn on code that does not compile. Running the suite is a separate,
   explicit step.
5. **Review and refactor** — I check what the hook cannot: whether the assertions mean
   anything.

## Conventions

Encoded in `.claude/skills/playwright-test-conventions/SKILL.md`:

- Role-based locators first; CSS only when the app offers nothing semantic, and then only
  inside a page object
- Assert relationships, not catalog values — carry a price captured earlier in the flow,
  compute totals rather than hardcoding them
- No fixed timeouts; wait on conditions
- Shared setup in fixtures, inputs in test data, never inline literals repeated across tests

## What the agents got wrong

Findings from this repo, in order of how hard they were to catch.

**The planner turned observations into assertions.** It proposed asserting a specific price,
a specific product id in the URL, and a specific brand — values it had seen in the DOM during
exploration. None of those are business rules; they're today's data. It also produced an
assertion containing "or" ("shows an empty state *or* contains no matching card"), which is a
tell that it had not established what the app actually does. Context awareness stops at what
the model can see.

**The generator wrote an assertion that could not fail.** For the no-match search it produced:

```ts
await expect(page.locator('.productinfo').filter({ hasText: 'No Such Product 999' })).toHaveCount(0);
```

No card contains that text — the product doesn't exist. This passes whether the search returns
zero results, the entire catalog, or nothing at all. The correct assertion is that no product
card is present:

```ts
await expect(productSearch.allProductCards).toHaveCount(0);
```

**A parsing bug in generated logic.** The generator wrote a helper to compute the expected
line total:

```ts
const numericPrice = Number(price.replace(/[^\d.]/g, ''));
```

Stripping everything that isn't a digit or a dot leaves the dot from "Rs." attached to the
front: `"Rs. 500"` becomes `".500"`, and `Number(".500")` is `0.5`. A three-order-of-magnitude
error in the expected value. It surfaced only because the failure was large enough to be
obvious — a subtler arithmetic error would have passed green while verifying the wrong thing.
Replaced with a capturing regex and numeric comparison:

```ts
const match = text.match(/Rs\.\s*([\d,]+)/);
return Number(match[1].replace(/,/g, ''));
```

**The agent stated the intention to verify, then didn't.** Asked to add an assertion, it
edited the file and closed its turn with: "next step is running the test to confirm it
passes." It knew verification was required and ended anyway. That gap is what the hook closes.

## The hook, in four attempts

Getting a hook to actually enforce anything took four tries, and the differences are the
interesting part.

**First: it never fired.** The command was conditioned on `$CLAUDE_FILE_PATHS` matching
`.spec.ts`. Nothing ran, silently — a hook that fails to fire looks exactly like a hook that
passed.

**Second: it fired and reported, but did not block.** Running the suite unconditionally, the
test failed and Claude Code logged `Failed with non-blocking status code`. The agent read the
failure and closed the turn anyway, reporting the edit as done. That is observability, not
enforcement.

**Third: it blocked.** The difference is one exit code — the hook must exit `2` for the agent
to be stopped and handed the error:

```json
"command": "npx playwright test --reporter=line || exit 2"
```

With that in place, breaking a locator on purpose produced the right behaviour: the test
failed, the agent could not end its turn, it checked the accessible name against the live
site, and it asked how to proceed rather than declaring success.

Two things this does not solve. The hook guarantees the agent stops; it does not guarantee
the agent fixes the right thing — the decision still came back to me, which is correct for a
locator the agent itself broke. And the hook runs on every `Edit|Write`, including markdown,
so writing a test plan triggered a full suite run and sent the agent chasing an unrelated
failure. Scope the matcher to the files that matter.

**Fourth: scoped, and cheaper.** The `matcher` only filters by tool name, so the path filter
lives in the command: it reads the edited file's path from the hook's stdin JSON and exits `0`
for anything that isn't `.ts`. For `.ts` edits it type-checks instead of running the suite:

```json
"matcher": "Edit|Write|MultiEdit",
"command": "jq -r '.tool_input.file_path // empty' | grep -q '\\.ts$' || exit 0; cd \"$CLAUDE_PROJECT_DIR\" && npx --no-install tsc --noEmit 1>&2 || exit 2"
```

Three details matter. `MultiEdit` is in the matcher because the healer edits with it.
`tsc` prints its errors to stdout, but a blocking hook only hands stderr back to the agent,
so without `1>&2` the agent is stopped without being told why. And `--no-install` matters
because `npx tsc` with TypeScript absent silently downloads an unrelated npm package named
`tsc`; TypeScript is a devDependency so the hook never depends on that.

The trade-off is explicit: the hook now guarantees the code compiles, not that the tests pass.
A full suite run on every edit took long enough, and failed for enough reasons unrelated to
the edit (network, ad iframes, a live third-party site), that it was more noise than gate.
Running the affected project is a separate, deliberate step, and CI runs everything.

## Decisions and trade-offs

**One spec, not one file per test.** The generator's own definition instructs it to write one
test per file. For a single flow that produces five files repeating the same setup through the
UI. Consolidated into one spec with shared fixtures.

**Chromium only, for now.** The first run failed differently in each browser: a navigation
timeout in Chromium (ad iframes never resolving under `waitUntil: 'load'`), an unstable click
in WebKit, and a missing price locator in Firefox. The generator had executed the flow once,
in one browser, at one moment — and wrote code describing that run. Cross-browser goes back on
once the flow is stable.

**The healer stays out of CI.** Self-healing is useful as a developer-side tool with review.
Unattended, a healer that "fixes" a failing test can weaken the assertion until it passes,
which silently removes the safety net. The failure might be the app, not the test.

**Skills guide, hooks enforce.** Generating without conventions and then with them produced
visibly different output — page objects, fixtures and test data appeared only in the second
run. But the parsing bug and the empty assertion survived both. A skill is text the model can
partially apply. Enforcement needs something deterministic.

**The UI job is non-blocking in CI.** The UI tests drive a live third-party site, so some
failures have nothing to do with the code. The API job blocks merges; the UI job runs with
`continue-on-error`, stays red when it fails, writes a pass/fail/flaky table to the job
summary and uploads the HTML report and traces. It should become blocking once its flaky
rate is low. Retries are 1 in CI.

**Session state comes from the API, not the UI.** The API's `verifyLogin` endpoint only
validates credentials and issues no session, so authentication still goes through the login
form — but once, in a setup project, with the result saved as `storageState`. The account
itself is created through the API, so no test depends on a pre-existing user.

## Next

- Make the UI job blocking once its flaky rate is low
- Watch API flakiness in CI: the site once answered `searchProduct` with an HTML page
  instead of JSON, and a single retry absorbed it
