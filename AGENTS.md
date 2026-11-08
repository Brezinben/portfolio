# AGENTS.md

Benjamin David's portfolio: static pages in a terminal interface, content in `src/content.json`.
Bun runs the build and the unit tests. Code, comments and commit subjects are in French.

## Commands

- Static checks: `bun run check` (`hk check --all`: format, lint, types, dead code, secrets, workflows).
- Unit tests: `bun run test`. Browser tests: `bun run test:browser`. Mutation: `bun run test:mutation`.
- Build: `bun run build` publishes the live site (`dist` is the served folder, ADR 0003). To test a
  build, set `PORTFOLIO_DIST=dist.test`. Package updates: `bun run deps`.

## Tools

The hooks enforce the rules on each edit, at the end of each reply and at each commit. To change
a rule, edit its config:

- Hooks (git, Claude Code, CI): `.config/hk.pkl`. The commit subject and branch name rules live there.
- Lint: oxlint, config in `.oxlintrc.jsonc`. Vendored anti-slop plugin in `tools/oxlint/anti-slop/` (see its `SOURCE.md`).
- Format: oxfmt, config in `.oxfmtrc.json`.
- Dead code and import cycles: rev-dep, config in `.rev-dep.config.jsonc`.
- Secrets: betterleaks, config in `.config/betterleaks.toml`.
- Machine tools and versions: mise, `.config/mise.toml`. Project tools: `package.json`.
- Claude Code hooks: `.claude/settings.json`, which calls `scripts/post-edit.sh` and `hk agent stop-hook`.
- Browser and mutation tests: `.config/playwright.config.ts`, `.config/stryker.config.json`.
- Worktrees: Worktrunk, `.config/wt.toml`.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/`.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles. Each label string equals its role name.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repository root.
See `docs/agents/domain.md`.
