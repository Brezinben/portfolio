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

## Browser tests

`bun run test:browser` (Playwright, files `tests/browser/*.spec.ts`). Test what the user sees and
does, in a real browser: select elements by role and accessible name, not by CSS class. Prefer a
browser test to a mocked DOM whenever the behaviour depends on layout, focus or real events.

## Accessibility tests

Run axe (`@axe-core/playwright`) on every page and state that a browser test reaches. A WCAG
2.2 AA violation fails the test.

## Mutation tests

`bun run test:mutation` (Stryker, scope in `.config/stryker.config.json`). Run it on the modules you
changed. A surviving mutant is a missing assertion: add the test, do not raise the threshold.
