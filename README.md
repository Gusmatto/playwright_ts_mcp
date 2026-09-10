# playwright_ts_mcp

Playwright + TypeScript test automation for [automationexercise.com](https://www.automationexercise.com/),
built with an agentic workflow: Playwright MCP, Test Agents (planner, generator, healer),
and a conventions skill — with a human review gate at every step.

The point of this repo is not the test coverage. It's the workflow: what agents are good at,
where they fail, and what a human still has to do.

## Stack

- Playwright with TypeScript
- Playwright Test Agents (`npx playwright init-agents`)
- Playwright MCP server (`.vscode/mcp.json`)
- Agent skill with team conventions (`.github/skills/`)

## Running

```bash
npm install
npx playwright test
npx playwright test tests/product-search-cart.spec.ts
```

## Structure

```
specs/          test plans in markdown (planner output, human-revised)
tests/
  pages/        page objects — locators live here, never in specs
  fixtures/     shared setup
  test-data/    search terms and other inputs
.github/
  agents/       planner, generator, healer definitions
  skills/       test conventions applied at generation time
```

## Workflow

1. **Plan** — the Planner explores the app in a real browser and writes a markdown plan.
2. **Review** — I revise the plan before any code is generated. This step is not optional.
3. **Generate** — the Generator executes each step in a browser and writes the spec,
   with the conventions skill attached.
4. **Review and refactor** — I verify the generated code, fix what the agent got wrong,
   and run it. The agent cannot run tests in this setup, so nothing it produces is verified
   until I run it.

## Conventions

Encoded in `.github/skills/playwright-test-conventions/SKILL.md`:

- Role-based locators first; CSS only when the app offers nothing semantic, and then only
  inside a page object
- Assert relationships, not catalog values — carry a price captured earlier in the flow,
  compute totals rather than hardcoding them
- No fixed timeouts; wait on conditions
- Shared setup in fixtures, inputs in test data, never inline literals repeated across tests

## What the agents got wrong

Three findings from this repo, in order of how hard they were to catch.

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

**Skills guide, they don't enforce.** Generating without conventions and then with them
produced visibly different output — page objects, fixtures and test data appeared only in the
second run. But the parsing bug and the empty assertion survived both. A skill is text the
model can partially apply; enforcement needs something deterministic, which is what hooks are
for.

## Next

- A hook that runs lint and the touched spec after every agent edit, so generated code cannot
  be handed back unverified
- API test layer with schema validation and fixtures for data setup
- CI pipeline running the suite on push