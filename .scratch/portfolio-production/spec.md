# Port the portfolio to a standalone production page

Status: ready-for-agent

## Problem Statement

I designed my portfolio in a Claude Design canvas. Three variants exist and they work: the
version terminal, the version illustrée and the version texte. I cannot deploy any of them.
Two of the three are worth deploying; the version illustrée is dropped and stays frozen in
the canvas.

Each variant is an artboard, not a web page. Each one wraps its body in `<x-dc>`, hides
its head inside `<helmet>`, and stores its code in a `<script type="text/x-dc">` block.
A browser cannot read that alone. It needs the canvas runtime.

That runtime is the real problem. It pulls React and ReactDOM from unpkg on every visit, and
it renders the page through a template engine that only exists inside the canvas. The first
load costs about 540 Ko, and 208 Ko of that is machinery: the runtime plus the framework it
needs. My own content is a fifth of what the visitor downloads.

I work in numérique responsable. I cannot ship a framework to render text that was already
written, and then call it a portfolio about sobriety. The argument dies on contact with the
artefact.

I am also alone on this project. No company, no pipeline, no build server. Any solution
that needs a toolchain to stay alive will rot the first month I do not touch it.

## Solution

A `production/` directory that holds real web pages. Open one in a browser and it works.
No canvas runtime, no React, no Babel, no compilation step at load time.

`production/` becomes the source I edit. The canvas in `design/` is frozen as the visual
reference: it records what the page must look like and how it must behave, and it stops
being a source of code.

The behaviour the visitor sees does not change. The version terminal keeps its three
volets, its six sections, its four missions, its mascotte, its eight themes, its keyboard
map, and its boot sequence. The version texte keeps its content and stays the fallback the
panic screen points at. Everything the canvas proved for those two stays.

Three things get better.

The page becomes light. The visitor downloads the page, the content, and the font. Nothing
else. No framework arrives to render text that was already written.

The content stays separate. `content.json` is fetched at load time, exactly as in the
canvas. I edit my missions, my stack, and my jokes without touching the page and without
redeploying anything.

The page behaves on a 49 inch screen. The layout stops growing at a maximum width and
stays centred, instead of stretching text across a metre of glass.

## User Stories

1. As a visitor, I want the page to appear quickly on a normal connection, so that I do not leave before I see anything.
2. As a visitor, I want the page to work with no framework download, so that my data plan is not spent on a compiler.
3. As a visitor, I want the page to render without in-browser compilation, so that my old laptop does not stall on arrival.
4. As a visitor, I want a boot sequence that ends, so that I know the page is alive and not broken.
5. As a visitor, I want the boot screen to hold while `content.json` loads, so that I never see an empty shell.
6. As a visitor, I want a clear failure screen when `content.json` cannot load, so that I understand the page failed and not my browser.
7. As a visitor on the failure screen, I want a retry button, so that a temporary network fault does not end my visit.
8. As a visitor on the failure screen, I want a link to the version texte, so that I can still read the content when the terminal cannot start.
9. As a visitor, I want to list the sections, so that I can see what this portfolio contains.
10. As a visitor, I want to open a section by typing its name, so that I do not have to learn a command syntax first.
11. As a visitor, I want `help` to list every command, so that I can discover the interface without a manual.
12. As a visitor, I want `Tab` to complete a command, so that I type less and guess less.
13. As a visitor, I want the arrow keys to recall my command history, so that I can repeat a command cheaply.
14. As a visitor, I want my first up arrow in a section to recall that section's own command, so that the terminal feels real.
15. As a visitor, I want completion to propose at most ten candidates without a scrollbar, so that the list stays readable.
16. As a visitor, I want the second word completed from the right vocabulary, so that a mood is proposed after the mascotte command and a section after `cd`.
17. As a visitor, I want my extra spaces normalised, so that a sloppy line still runs.
18. As a visitor, I want an unknown command to answer with a useful message, so that a typo does not look like a crash.
19. As a visitor, I want to open a mission fiche, so that I can read what Benjamin actually did on a project.
20. As a visitor, I want to open a fiche techno, so that I can see where a technology was used and why.
21. As a visitor, I want to search the content with `ask`, so that I can find an answer without reading every section.
22. As a visitor, I want a direct link to a section or a mission, so that I can share the exact thing I want to show someone.
23. As a visitor, I want the browser back button to work after I navigate, so that the page respects the browser I already know.
24. As a visitor, I want the mascotte to react and to be draggable, so that the page rewards curiosity.
25. As a visitor, I want easter egg commands, so that exploring the terminal is worth the effort.
26. As a visitor, I want the context gauge to fill and to compact itself with a joke, so that the terminal metaphor pays off.
27. As a visitor, I want a section I open for the first time to type its command before answering, so that the terminal behaves like a terminal.
28. As a visitor, I want a section I already saw to answer at once, so that the effect never becomes a delay.
29. As a visitor, I want the theme change to spread from where I clicked, so that the transition follows my hand.
30. As a visitor who turned animations off, I want the theme transition off as well, so that the setting means what it says.
31. As a visitor, I want the stack to arm on my first validation and then follow my focus, so that I read fiches without pressing a key each time.
32. As a visitor, I want to choose among the eight themes, so that I can read the page comfortably.
33. As a visitor, I want my theme, text size, animation, and density settings kept on my device, so that I do not set them again on my next visit.
34. As a visitor, I want to resize the command journal by dragging, so that I can give more room to what I am reading.
35. As a visitor, I want the page never to grow past my screen height, so that the terminal never becomes a scrolling web page.
36. As a visitor, I want content aligned to the top of its volet, so that short output is not stretched down the pane.
37. As a visitor, I want my focus position remembered per volet, so that returning to a volet puts me back where I was.
38. As a keyboard visitor, I want to reach every control with the keyboard alone, so that I never need a mouse.
39. As a keyboard visitor, I want a visible focus ring, so that I always know where I am.
40. As a mouse visitor, I want no focus ring on click, so that the interface does not look broken when I use a pointer.
41. As a keyboard visitor, I want `Échap` to close the options modal and return my focus where it was, so that I do not lose my place.
42. As a screen reader visitor, I want every control labelled, so that I can operate the terminal without seeing it.
43. As a screen reader visitor, I want command output announced, so that I learn the result of what I typed.
44. As a visitor who reduced motion, I want animations disabled, so that the page does not make me ill.
45. As a visitor with a colour preference, I want the page to respect `prefers-color-scheme` on arrival, so that the first paint matches my system.
46. As a visitor with low vision, I want text contrast to pass on every one of the eight themes, so that no theme is a trap.
47. As a visitor on a phone, I want the three volets to stack into one column, so that the terminal stays usable on a small screen.
48. As a visitor on a 49 inch screen, I want the layout to stop growing and stay centred, so that I do not read a line one metre wide.
49. As a visitor, I want scrolling to work with the wheel and the keyboard even though the scrollbars are hidden, so that hidden chrome never traps content.
50. As a visitor, I want an indicator when a volet has more content below, so that I know to scroll.
51. As a visitor, I want to share the page to a chosen target, so that I can send it where my contacts are.
52. As a visitor, I want to copy the link to the clipboard, so that I can paste it anywhere.
53. As a visitor, I want to send a proposal with `propose`, so that I can contact Benjamin without leaving the page.
54. As a visitor using `propose`, I want to see exactly what will be sent and what will not, and to confirm it, so that nothing leaves without my consent.
55. As a visitor, I want the page to set no cookie, so that my visit leaves nothing behind.
56. As a visitor, I want the version texte to be one plain column with no script, so that I can read the content on any device or any connection.
57. As a visitor on either page, I want a working link to the other one, so that I can choose the version that suits me.
58. As an AI agent or a crawler, I want `llms.txt` served and accurate, so that I can summarise this profile correctly.
59. As a link preview service, I want the Open Graph tags and `share.png` to resolve, so that a shared link renders a card.
60. As a search engine, I want a canonical URL and a description on each variant, so that I index the right page.
61. As Benjamin, I want to edit `content.json` alone and see the change on the next load, so that I never redeploy to fix a typo.
62. As Benjamin, I want the page to fail loudly when `content.json` is malformed, so that I catch my own mistake at once.
63. As Benjamin, I want a `production/` directory whose contents I can copy to the web root as they are, so that deployment is a file copy and a Caddy redirect.
64. As Benjamin, I want the page to run from a plain static server with no build step, so that the project still works after a year of neglect.
65. As Benjamin, I want a test that fails when the page grows past its weight budget, so that my numérique responsable claim is enforced and not merely asserted.
66. As Benjamin, I want a test that fails on an accessibility regression, so that I do not break the thing I sell.
67. As Benjamin, I want the command behaviour tested without a browser, so that the thirty commands stay cheap to cover.
68. As Benjamin, I want `oxlint` and `oxfmt` configured for this project, so that the code stops being as dirty as the canvas draft.
69. As Benjamin, I want to push the repository to GitHub, so that the code is public and backed up.
70. As Benjamin, I want the audience measurement to fail silently when Umami is blocked, so that a blocked tracker never breaks a visit.
71. As Benjamin, I want both pages and `llms.txt` to state the same facts, so that a reader never finds two versions of my career.

## Implementation Decisions

**`production/` is the source. `design/` is frozen.**
The port happens once, by hand. After that, `production/` holds the code I edit and
`design/` becomes a read-only visual reference. No script regenerates one from the other.
A generator was considered and rejected: it would add a build step, and it could not remove
React on its own.

**No build step and no compilation at load time. One small framework, self-hosted.**
The canvas runtime, React and ReactDOM all disappear. What ships is HTML, CSS and JavaScript
that a browser runs as written, plus Alpine.

**Alpine replaces the canvas runtime.**
The canvas separates its view model from its template: `renderVals()` returns a flat object
with no DOM in it, and a 494-line template consumes that object through five primitives —
interpolation, keyed list, conditional, event binding, callback ref. React is only the backend
of that template.

Alpine provides the same five primitives from HTML attributes, which is why it was chosen over
writing the engine by hand. The cost was measured before deciding, and it is not small.
Alpine has no moustaches, so all 265 interpolations are rewritten: the 88 that fill an element
become `x-text`, and the 177 that sit inside an attribute become bindings carrying a template
literal. The roughly 40 closures that `renderVals()` returns today — handlers and refs — move
up into the template as `x-on:` and `x-ref`. Alpine is pinned to an exact version and served
from `production/`, never from a CDN, because a CDN would put back the third-party request the
port exists to remove.

Benjamin was shown the alternative — about 300 lines of hand-written engine, zero added
weight, zero template rewrites — and chose Alpine anyway, preferring code maintained by
others over code he alone owns. That reasoning is the decision; the rewrites are its price.

**Alpine's reactive data replaces the explicit state object.**
The canvas class of roughly two thousand lines uses `this.state`, `this.setState` and
`this.props` against the canvas base class. The port moves that state into Alpine's reactive
data, and the ninety-odd `setState` calls become plain property assignment.

Three points need care. Alpine re-renders from its proxy, so the mascot must keep writing its
transform and position directly rather than through reactive state; it already does, and that
pattern stays. The theme transition depends on the DOM being committed before
`startViewTransition` resolves, which was a `setState` callback and becomes `$nextTick`. And
the manual change detector in `componentDidUpdate`, which compares hand-built signature
strings, disappears: the ordering it protected — scroll to bottom, then the focus trap — must
be reproduced explicitly after each commit.

**Both canvas props are deleted.**
`startSection` becomes the hard-coded starting section, because anchors already handle deep
links. `holdBootScreen` existed only so the canvas editor could freeze the boot screen for
review; nothing injects it outside the canvas and it goes. The consequence lands on the
tests: the browser seam exercises the boot screen by serving content slowly or not at all,
since it can no longer freeze it.

**Three defects in the persisted state are fixed, and one setting is removed.**
The text size setting does nothing: `scale` is in the initial state, it is written to storage,
the options modal advertises three steps, and no line ever reads it. It is removed entirely
rather than implemented, so the modal stops offering a control that does nothing. Six keys
remain persisted instead of seven. `loadOpts` currently splices whatever storage holds into
state with no whitelist, while the write side lists its keys explicitly; the port filters on
those six. `booted` is written once, never read, and goes.

**The command interpreter becomes a pure synchronous module.**
This is a new seam, and it is deliberate. Today dispatch is already a single point: a
325-line `if` ladder keyed on the command name, of which 21 of 29 branches are pure or nearly
so. The port inverts the contract to `interpret(input, context) → { lines, effects }`.

Effects are descriptors, not method calls: navigate, track, say, emote, open, copy, set a
timer. The shell applies what the interpreter describes. All 29 branches go through it, so
dispatch stays in one place rather than splitting into a pure half and an impure half.

The interpreter stays synchronous, which two commands seem to forbid and do not. `cowsay`
reads the live pane width, so the width is injected through the context. `ask` and `ai` are
asynchronous, so the interpreter returns the pure part as lines and the asynchronous call as
an effect the shell resolves afterwards. Nothing in the interpreter awaits anything.

This is what makes the twenty-nine commands testable in milliseconds without a browser.

**`content.json` keeps its contract.**
The schema is unchanged: `profile`, `share`, `feedback`, `sections`, `details`, `timeline`,
`stack`, `techNotes`, `jokes`. The line types are unchanged. The file is fetched with a
relative URL at load time and must sit beside the page. Changing the content requires no
deployment. This separation is the point of the architecture and it survives the port
untouched.

**A malformed `content.json` fails like a missing one.**
The canvas only handles a failed fetch. The port also validates the shape after parsing.
A missing required key produces the same failure screen, with the offending key named. A
silent half-rendered page is not acceptable.

**The four boot states are kept.**
Boot with its system log, hold while the content loads, failure with a retry button and a
link to the version texte, and the crossfade into the terminal. The failure screen keeps
its Go panic styling.

**The font is self-hosted, in two weights.**
Google Fonts currently costs two preconnects, a stylesheet request, two families and four
weights. Two of those four are waste, and measurement says so. Italic is loaded and used
nowhere: zero occurrences in the terminal page and in the content. `Noto Sans Symbols 2` is
requested and no `font-family` rule references it, so its file never downloads at all.

The port serves JetBrains Mono from `production/` in weight 400 and weight 700 only, subset
to the glyphs the page uses, with `font-display: swap`. The single 500 in the terminal folds
into one of the two. The preconnects to Google go with the rest. That removes the last
third-party request from a page that promises none.

**A weight budget is fixed and enforced.**
First load, uncached, measured after compression, third-party scripts excluded: **150 Ko
transferred**. The estimate after the port is about 119 Ko, of which Alpine is 19 Ko measured
gzipped, so the budget carries roughly 30 Ko of headroom. It is tight enough to catch an added font weight or a library, and
loose enough to survive a new paragraph in the content. Umami is deferred and optional, so it
sits outside the budget. The budget is a test, not a comment.

**The vertical contract is kept and a width cap is added.**
The height contract is unchanged and it is not negotiable: the page is bounded to the
viewport height and never grows, the session keeps a floor, the journal yields space first,
and content aligns to the top instead of stretching.

The width cap is the one new rule. Benjamin already asked for the layout to widen on a large
screen, and that stays. The cap is **2400 px**: past it the three volets stop growing and the
layout centres. A 27 inch screen is never capped. On a 49 inch screen the terminal holds the
middle of the glass instead of spreading a line of text across a metre of it. No redirection and no automatic variant switch, because deciding for the
visitor would trap keyboard users. The existing 900 px breakpoint that stacks the volets into
one column is unchanged.

**The two open accessibility points are closed as Benjamin arbitrated them.**
The `light` accent `#e6a000` gives about 2,2:1. Benjamin chose that hue knowingly and it
stays. The fix is to split the amber in two: a decorative amber for pastilles, accent bars
and rules, and a separate text amber that passes contrast. The hue does not change. The
focus ring moves to `:focus-visible`, so it appears for keyboard use and not on click.

**Two pages are ported, not three. The version illustrée is dropped.**
`production/` holds `index.html` for the version terminal, `texte.html` for the version
texte, plus `content.json`, `share.png`, `llms.txt` and the CV the `cv` command opens. Names
are lowercase, unaccented and unspaced, so the URLs are shareable without encoding.

The version texte is nearly static already, so it is cheap, and it is not optional: the panic
screen links to it, and that link is what a visitor has left when the content fails to load.

The version illustrée stays frozen in `design/`, served to nobody. Its SVG mission animations
and its interactive technical map are not ported, and its eighteen CDN-fetched logos become
somebody else's problem rather than a third-party request on a page that promises none.

**The frozen values stay frozen.**
Nine timings and thresholds were fixed after explicit iteration and must not become settings
again: boot duration, execution latency, typing speed, bar fill, boot fade, autocomplete
expand and collapse, the crown threshold, and the autocomplete proposal count. The decision
journal lists each value. Porting them to new code is a copy, not a redesign.

**Inline styles only. No CSS class.**
This is a hard writing constraint from the design, not a habit to clean up. The single
stylesheet carries only what cannot be inline: keyframes, font face, resets, scrollbar
hiding, and box sizing. A port that extracts everything into a stylesheet breaks the
constraint even though the page would still look right.

The constraint bends in exactly one place, and it is forced. The canvas template carries 12
`style-hover` and 12 `style-focus` attributes. Those are not HTML: the canvas runtime
synthesises them. A real browser cannot express a hover or a focus state inline, so those 24
declarations become CSS rules in the stylesheet. This is the same bend the approved
`:focus-visible` fix already required, since that too is a pseudo-class. Nothing else moves
out of the inline styles.

Measured while porting, the rest of the canvas-only syntax is: 44 `hint-placeholder-*`
authoring hints that are simply dropped, 31 event attributes that become Alpine bindings, and
10 `ref` attributes that become `x-ref`. The template declares exactly one CSS class.

**The hard-coded content fallback is dropped.**
The canvas embeds a full copy of the content in the page, behind the fetched JSON. The agreed
boot behaviour makes it unreachable: when the JSON does not load, the page shows the panic
screen, it does not silently fall back. Benjamin confirmed the deletion. Roughly twenty
kilobytes go, and the content keeps a single source of truth instead of two copies drifting
apart by hand.

**Benjamin's text is verbatim and the JSON keys are English.**
No sentence he wrote gets reformulated during the port, in any variant. Every `content.json`
key stays English, by explicit request.

**Six traps must not be reintroduced.**
Each one cost an iteration to find. Line-by-line staggering produced a two-wave effect and
was replaced by per-block appearance. Per-letter animation was tested and rejected. The
autocomplete close timer must stay deterministic: a generation counter once cancelled the
list clearing instead of protecting it, and the list stayed mounted over the session. Font
ligatures must stay off, or the ASCII art recomposes. Multi-space collapsing must stay
defeated by the per-line preformatted flag, for the same reason. The mascotte sprite is
validated and must not be redrawn; two attempts were rolled back.

**Audience measurement stays optional.**
The Umami snippet and the event plan are unchanged. The tracking helper stays silent: if
Umami is absent, blocked, or failing, nothing breaks and nothing is logged to the console.

**`oxlint` and `oxfmt` are configured for this project.**
The current `oxlintrc.json` was copied from a Next.js project. It enables `nextjs`, `react`,
and `react-perf`, ignores `.next/**` and `.specify/**`, and references an `anti-slop` plugin
that does not exist here. It is rewritten for a vanilla browser project: `unicorn`, `oxc`,
`promise` and `import`, plus the four categories including `style`, plus the `@stylistic`
rules Benjamin asked for. `typeAware` goes, because there is no TypeScript. `jsx-a11y` goes
too, because it only inspects JSX and there will be none; accessibility is covered at the
browser seam instead, where it can actually be observed.

Seven rules of the `style` category are turned off, each because it contradicts a decision
already taken. The four `import` export rules — `no-named-export`, `prefer-default-export`,
`group-exports`, `exports-last` — would force the interpreter module into a single default
export, and that module's named exports are the test seam. `one-var` would merge declarations
that `padding-line-between-statements` exists to separate. `id-length` would rename `m`, `t`,
`c` and `w`, which are `content.json`'s own schema keys. `max-statements` would split the
command dispatcher, which is deliberately one point. `no-magic-numbers` and `no-ternary` are
off at Benjamin's request.

`one-var` has no inverse rule to turn on instead. `one-var-declaration-per-line` looks like
one and is not: it governs the line breaks between declarations that are already grouped, not
whether they are grouped at all. It is also deprecated in ESLint since v8.53, in favour of
`@stylistic/eslint-plugin-js`.

Two `style` rules cannot both hold on a module that exports types and values. `import`'s
`consistent-type-specifier-style` demands a top-level `import type` statement.
`no-duplicate-imports` then reads that statement as a second import of the same module and
rejects it. `src/app.ts` imports both from `src/interpret.ts`, so one rule had to go.
`consistent-type-specifier-style` is off, and the type specifiers stay inline. Tests keep
`no-duplicate-imports` off instead: a test that imports the type and the value separately
names what it checks.

One operational note that cost an hour to find: the `@stylistic` rules are a JavaScript
plugin, and the standalone oxlint binary loads no JavaScript plugin. Run through `npx oxlint`
and they fire; run the bare binary and **they are silently inert** — no error, no warning, no
rule. The lint script therefore calls `npx oxlint`, and `@stylistic/eslint-plugin` and
`@oxlint/plugins` are development dependencies. Both tools are already
installed through mise: `oxlint` 1.81.0 and `oxfmt` 0.66.0.

**The repository is public on GitHub, named `portfolio`.**
It carries `production/`, the frozen `design/` without `uploads/`, `DECISIONS.md`,
`CONTEXT.md`, the spec and the tests.

The handle is confirmed and it was worth checking: the account is **`Brezinben`**, with a
capital B, at `github.com/Brezinben`. `content.json` writes it lowercase. This closes item 3
of the design journal's remaining work, which recorded the handle as an unverified deduction.

## Testing Decisions

A good test here states what a visitor can observe and nothing else. It types a command and
reads the output. It presses a key and checks where the focus went. It loads the page and
measures what crossed the network. It never reaches into a state object, never asserts a
class name, and never counts DOM nodes. The port rewrites the entire render layer, so any
test coupled to internals would be rewritten with it and would have proved nothing.

Two seams, and no more.

The tooling is split on purpose. Seam two runs on `node:test`, which ships with node and needs
no dependency at all. Seam one runs on Playwright. So a `package.json` and a `node_modules`
exist, and they are development-only: `production/` has no build step and no dependency, and
must remain copyable to a static server by someone who never runs npm. The split also means
the interpreter tests still run in a year of neglect, when only the browser tooling has rotted.

**Seam one: the page as served.** A real browser loads `production/` over HTTP. This seam
covers everything a visitor experiences.

- The four boot states, driven by serving a valid `content.json`, a missing one, a malformed one, and a slow one.
- Navigation: sections, missions, fiches techno, deep links by anchor, and the browser back button.
- The keyboard map from the design: volet changes, section changes, completion, history, and escape.
- Focus: a visible ring on keyboard use, none on click, and focus returned after the options modal closes.
- Settings kept across a reload on the same device.
- Accessibility, checked with an automated rule engine on each of the eight themes, plus `prefers-reduced-motion` and `prefers-color-scheme`.
- The weight budget, measured as bytes actually transferred on a cold load.
- Both pages load, and the link between them resolves.

**Seam two: the command interpreter.** A pure function tested in Node with a fixture
`content.json`. This seam exists because thirty commands through a browser is slow and
brittle. It covers every command, every alias, completion candidates, history recall,
unknown command handling, and `ask` search results. It asserts the returned output and
state change, never how the interpreter computes them.

Autocomplete belongs to this seam and is the largest part of it. The tests cover prefix
filtering, the ten-proposal ceiling, the recognised slash prefix, multi-space normalisation,
and the contextual second word: moods after the mascotte command, sections and missions after
`cd`, targets after `share`, head modes after `cowsay`, and free text after `ask`.

The frozen values are asserted at this seam where they are logic, and at seam one where they
are timing. A change to any of the nine fails a test that names the value.

There is no prior art. This project has no tests and no git history before this spec. The
conventions written here become the prior art for what follows.

## Out of Scope

- Hosting `content.json` on GitHub, or fetching it from anywhere but beside the page. Local stays local for now. The relative fetch does not prevent it later.
- The Caddy redirect and the DNS entry for `portfolio.brezinben.dpdns.org`. Benjamin does that himself. This spec only guarantees that `production/` can be copied to a web root as it is.
- Any change to the content itself: no new mission, no rewritten section, no new command. Behaviour is preserved, not extended.
- Any new visual design. The canvas is the reference and the port matches it.
- Synchronising the version texte and `llms.txt` with the terminal wording, and the GitHub handle check. These are content corrections listed in the design README. They deserve their own ticket.
- Everything about the version illustrée: its animations, its technical map, and its logos. It is out of the deployed set entirely.
- `design/uploads/`: twenty-one pasted design screenshots, 2,9 Mo, referenced by no page. Excluded from git. The CV that lives there is served from `production/` instead, because the `cv` command opens it.
- Deploying `share.png` to the domain root, which is a deployment act.
- Testing the `ai` command against a local Chrome model. It needs browser flags a test cannot set.
- Server-side rendering, a static site generator, and any package that produces the HTML. The absence of a build step is the requirement, not an accident.
- A CI pipeline. Benjamin is solo and has no runner. The tests run on his machine.

## Further Notes

The measurement behind the problem statement, taken from the live unpkg URLs the canvas
runtime requests:

| Resource | Weight |
|---|---|
| `react-dom` 18.3.1 | 129 Ko |
| `react` 18.3.1 | 10 Ko |
| canvas runtime | 69 Ko |
| version terminal page | 160 Ko |
| `content.json` | 23 Ko |

The canvas runtime also names `@babel/standalone`, 3 064 Ko. It is **not** loaded by these
pages. The runtime fetches it only for an external `.jsx` or `.tsx` import, and none of the
three variants uses one; their inline code runs straight through `new Function`. React and
ReactDOM, by contrast, are loaded unconditionally at boot.

Two reference documents exist, and they rank.

`DECISIONS.md` is the primary reference. It is the decision journal of the canvas work: it
quotes Benjamin's own requests, records what was accepted and what was rejected, and names
the traps that cost an iteration. It answers "why is it like this", which the code cannot.
Read it before touching the render layer, and read it again before judging any choice odd.
Several are counter-intuitive and were validated by iteration.

The design README is the secondary reference. It is the behavioural catalogue: commands,
keyboard map, the seven mascotte moods, the eight themes, the boot states, the `content.json`
line types, and the Umami event plan. It is more precise than this spec on every visual
detail.

Both stay correct because `design/` is frozen.

Three discrepancies were found while reconciling the two documents against the code. None
blocks the port, and each needs a decision during it. The decision journal lists four canvas
props, the page declares three: `showOutputPane` is missing from the page. The journal writes
the response time key as `response_time_in_hours`, the file uses `responseTimeInHours`. The
journal says the illustrated variant uses no image, and the variant fetches eighteen SVG
logos from a CDN. That last one is now moot: the variant is out of scope.

`CONTEXT.md` at the repository root is the glossary and it is authoritative. It resolves the
three collisions the design documents carry: sortie meant both the right pane and a command
result, session meant both the centre pane and the whole visit, journal meant both the command
history and the boot log.

Documents are written in French, code is written in English, and `CONTEXT.md` gives both names
for every term. This matches the existing rule that `content.json` keys are English. Do not
invent synonyms on either side.

Two constraints in the decision journal are not accessibility rules and are easy to break by
accident. The visual vocabulary is square: radius zero everywhere, a two pixel amber accent
bar on the active element, a caret on the selected line, tree glyphs for hierarchies, block
gauges rather than filled progress bars, and tabular figures for years. And the Claude logo
is deliberately not the official mark: Benjamin supplied a glyph, it is used as supplied, and
reproducing the real trademark is not a fix.
