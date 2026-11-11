# Issue tracker: GitHub Issues

Issues and specs for this repo live in the GitHub Issues of `Brezinben/portfolio`. Use the
`gh` CLI for every operation. Never write an issue, a spec or a ticket to a local file:
`.scratch/` is gone on purpose, and a local file is invisible to the owner and to the next
agent.

## Conventions

- One spec per issue. The issue body follows the spec template of the skill that writes it.
- An implementation ticket is its own issue. Its body starts with `Part of #<spec>`.
- The triage state is a label (see `triage-labels.md`). An issue carries exactly one triage
  label.
- Conversation goes in issue comments, never in edits of the body.

## When a skill says "publish to the issue tracker"

```sh
gh issue create --repo Brezinben/portfolio --title "<title>" --body-file <file> --label <triage-label>
```

Write the body to a temporary file outside the repository, pass it with `--body-file`, then
delete the file. The issue URL that `gh` prints is the reference to give the user.

## When a skill says "fetch the relevant ticket"

```sh
gh issue view <number> --repo Brezinben/portfolio --comments
```

The user passes the issue number or its URL.

## Wayfinding operations

Used by `/wayfinder`. The **map** is an issue; each **child** ticket is an issue that points
to it.

- **Map**: an issue labelled `map`, with the Notes / Decisions-so-far / Fog body.
- **Child ticket**: an issue whose body starts with `Part of #<map>` and a `Type:` line
  (`research`/`prototype`/`grilling`/`task`), then the question.
- **Blocking**: a `Blocked by: #NN, #NN` line under `Part of`. A ticket is unblocked when
  every issue it lists is closed.
- **Frontier**: `gh issue list --repo Brezinben/portfolio --search "Part of #<map> in:body" --state open`,
  then keep the unblocked issues with no assignee; the lowest number wins.
- **Claim**: `gh issue edit <number> --add-assignee @me` before any work.
- **Resolve**: comment the answer under an `## Answer` heading, close the issue, then comment
  a context pointer (gist + issue link) on the map under Decisions-so-far.
