# playwright_ts_mcp

Playwright + TypeScript test automation for [automationexercise.com](https://www.automationexercise.com/),
built with an agentic workflow: Playwright MCP, Test Agents (planner, generator, healer),
a conventions skill, and a hook — with a human review gate at every step.

The point of this repo is not the test coverage. It's the workflow: what agents are good at,
where they fail, and what a human still has to do.

## Stack

- Playwright with TypeScript
- Playwright Test Agents (`npx playwright init-agents`)
- Playwright MCP server (`.vscode/mcp.json`)
- Agent skill with team conventions (`.github/skills/`)
- Claude Code hook gating agent turns on test results (`.claude/settings.json`)

## Running

```bash
npm install
npx playwright test
npx playwright test --project=ui
npx playwright test --project=api
```

## Structure

```
specs/              test plans in markdown (agent output, human-revised)
tests/
  ui/
    pages/          page objects — locators live here, never in specs
    *.spec.ts
  api/
    clients/        request client: base URL, form encoding, response parsing
    schemas/        response shape validation
    *.spec.ts
  fixtures/         shared setup, used by both layers
  test-data/        search terms, account builder
  auth.setup.ts     seeds an account via API, saves an authenticated session
.github/
  agents/           planner, generator, healer definitions
  skills/           test conventions applied at generation time
.claude/
  settings.json     PostToolUse hook
```

UI and API run as separate Playwright projects. The API project runs without a browser;
the UI project depends on the auth setup and reuses a saved `storageState`.

## Workflow

1. **Plan** — the Planner explores the app in a real browser and writes a markdown plan.
2. **Review** — I revise the plan before any code is generated. This step is not optional.
3. **Generate** — the Generator executes each step in a browser and writes the spec,
   with the conventions skill attached.
4. **Verify** — a hook runs the suite after every agent edit. The agent cannot end its turn
   on a failing test.
5. **Review and refactor** — I check what the hook cannot: whether the assertions mean
   anything.

## Conventions

Encoded in `.github/skills/playwright-test-conventions/SKILL.md`:

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

## The hook, in three attempts

Getting a hook to actually enforce anything took three tries, and the differences are the
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

**Session state comes from the API, not the UI.** The API's `verifyLogin` endpoint only
validates credentials and issues no session, so authentication still goes through the login
form — but once, in a setup project, with the result saved as `storageState`. The account
itself is created through the API, so no test depends on a pre-existing user.

## Next

- API specs against the revised plan in `specs/api-test-plan.md`
- CI pipeline running both projects on push