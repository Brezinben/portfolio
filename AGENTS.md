# AGENTS.md

This repository is public. Commit nothing the live site does not already show:
no host address, no path of the serving machine, no secret, no personal detail.

Benjamin David's portfolio: static pages in a terminal interface, content in `src/content.json`.
Bun runs the build and the unit tests.

## Languages

- French: documents, code comments, commit subjects and commit descriptions.
- English: identifiers, branch names and test labels. A test label starts with `should`.

Write the current state, not its history. Point to the command or the file that gives a value;
do not copy the value.

## Commit messages

The subject uses the infinitive. The description uses the present indicative and says why the
change exists. The diff already shows what changed. The subject length and prefix rules live in
`.config/hk.pkl`.

```
Rattacher le nom au site par une fiche Person

Le site n'apparaît pas quand on cherche « Benjamin David ». La fiche schema.org Person, avec ses
liens sameAs vers LinkedIn et GitHub, dit à Google que cette page désigne cette personne.
```

## Commands

- Static checks: `bun run check` (`hk check --all`: format, lint, types, dead code, secrets, workflows).
- Before a change starts, read `.claude/rules/testing.md` to pick its tests.
- Unit tests: `bun run test`, with the coverage floor: `bun run test --coverage`. Browser tests:
  `bun run test:browser`, smoke set: `bun run test:smoke`. Mutation: `bun run test:mutation`.
  Lighthouse: `bun run test:performance`, on a build in `dist.test`.
- The CI (`.github/workflows/tests.yml`) also runs the coverage floor, the browser suite, Lighthouse,
  and opengrep on the files a change touches.
- Heavy commands (`bun run check`, browser, Lighthouse and mutation tests) go through `hochet`, the
  machine-wide queue: `hochet bun run test:browser`. `hochet status` shows who holds each slot.
- Build: `bun run build` writes `dist`. Only the host `beta` serves `dist` (ADR 0003): a build
  there publishes the live site, a build elsewhere publishes nothing. To test a build, set
  `PORTFOLIO_DIST=dist.test`. Package updates: `bun run deps`.
- Publish: on the serving host, in its checkout of this repository, run
  `git pull --ff-only && bun install --frozen-lockfile && bun run build`.
  Keep the dev dependencies: the build imports rolldown and html-minifier-terser.

## Tools

The hooks enforce the rules on each edit, at the end of each reply and at each commit. To change
a rule, edit its config:

- Hooks (git, Claude Code, CI): `.config/hk.pkl`. The commit subject and branch name rules live there.
- Lint: oxlint, config in `.oxlintrc.jsonc`. Vendored anti-slop plugin in `tools/oxlint/anti-slop/` (see its `SOURCE.md`).
  Test honesty rules: `@interfere/landmines`.
- Format: oxfmt, config in `.oxfmtrc.json`.
- Dead code and import cycles: rev-dep, config in `.rev-dep.config.jsonc`.
- Secrets: betterleaks, config in `.config/betterleaks.toml`.
- Machine tools and versions: mise, `.config/mise.toml`. Project tools: `package.json`.
- Dependency PRs: Dependabot, `.github/dependabot.yml`. Its merge and screenshot jobs live in `tests.yml`; the `screenshots` branch is pruned by `prune-screenshots.yml`.
- Claude Code hooks: `.claude/settings.json`, which calls `scripts/post-edit.sh` and `hk agent stop-hook`.
- Browser and mutation tests: `.config/playwright.config.ts`, `.config/stryker.config.json`.
- Coverage floor: `bunfig.toml`. Lighthouse assertions: `.config/lighthouserc.json`.
- Security static analysis: opengrep, pinned in `.config/mise.toml`; the rules commit is in the CI workflow.
- Worktrees: Worktrunk, `.config/wt.toml`.
- Issues and specs: GitHub Issues of `Brezinben/portfolio`, through `gh`. Labels and commands in
  `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`. No local issue files.
