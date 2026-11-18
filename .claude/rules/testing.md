---
paths:
  - "tests/**/*.ts"
  - "src/**/*.ts"
---

# Tests

Write the test before the code: use the skill `mattpocock-skills:tdd` (red, green, refactor).
A bug fix starts with a test that reproduces the bug.

## Unit tests

`bun run test` (`bun test`, files `tests/unit/*.test.ts`). One behaviour per test, named after
that behaviour. Test the public interface of a module, not its internals. A unit test touches no
network and no real clock.

## Coverage

`bun run test --coverage` fails when a file falls below the floor of `bunfig.toml`. Bun applies the
floor to each file, not to the total. When the weakest file rises, raise the floor; never lower it.
Cover a new branch with a test that checks its result: a test without an assertion adds coverage
and proves nothing.

## Property tests

Write a property test for a parser, a validation, or a serializer: `fc.assert(fc.property(…))`
from `fast-check`, imported by name (`tests/unit/share.test.ts`). State a property that holds for
every input (a round trip, an invariant, a comparison with a simpler model), not a copy of the
implementation. Keep each failing input that fast-check prints as an example test.

## Browser tests

`bun run test:browser` (Playwright, files `tests/browser/*.spec.ts`). Test what the user sees and
does, in a real browser: select elements by role and accessible name, not by CSS class. Prefer a
browser test to a mocked DOM whenever the behaviour depends on layout, focus or real events.

## Smoke tests

Tag with `{ tag: "@smoke" }` the few tests that prove the page starts and the terminal answers.
Keep the smoke set under a minute: `bun run test:smoke` runs it, and the CI runs it before the
browser suite.

## Accessibility tests

Run axe (`@axe-core/playwright`) on every page and state that a browser test reaches. A WCAG
2.2 AA violation fails the test.

## Mutation tests

`bun run test:mutation` (Stryker, scope in `.config/stryker.config.json`). Run it on the modules you
changed. A surviving mutant is a missing assertion: add the test, do not raise the threshold.
