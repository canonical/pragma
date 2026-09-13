# INTRINSIC-GRID — the running log

A running log of every fight with the intrinsic grid model (AX.1: intrinsic
sizing throughout — `min-content`, `1fr`, `minmax()` — never
breakpoint-swapped templates; the shell's small-viewport collapse is the one
sanctioned exception). Ruled into existence by P-D18: what broke, what fixed
it, why. Newest entries at the bottom; entries are never rewritten, only
appended — a later entry may overturn an earlier one.

---

## 1 — Bare `1fr` is a lie the canvas will eventually expose (P-4.1)

**What.** The shell's column template is the spec's `min-content 1fr`
(`layout.shell` `ds:grid`). Written literally, the viewport column's implied
minimum is `min-content` — the widest unbreakable thing in the canvas (a
`pre`, a long token URI, P-5's graph SVG) becomes the FRAME's minimum width,
and the whole instrument body widens or hands the page a horizontal
scrollbar. The frame's stability would then depend on canvas content, which
is exactly what AX.6 forbids.

**Fix.** `grid-template-columns: min-content minmax(0, 1fr)` on the shell,
`min-inline-size: 0` on the viewport, and the same release on the block axis
(`min-block-size: 0` down the viewport → canvas chain) so the canvas region
scrolls instead of stretching the 100dvh shell.

**Why logged.** Nothing visibly broke — the failure was preempted, because
the spec itself warns (A.06 §1 rule 3: regions own their scroll,
`min-size: 0`) and the apps-tier `ViewLayout` fought this exact fight first.
Logged as a preemption, honestly labelled: the byte in the stylesheet that
future readers will be tempted to "simplify" back to `1fr`.

## 2 — The scroll model: the exhibit's sticky chrome lost to §1.3 (P-4.1)

**What.** The A.06 exhibit lets the PAGE scroll and pins the rail/strip with
`position: sticky; height: 100vh`. The landed rule says the opposite: "the
shell never scrolls at all" (A.06 §1 rule 3). Both produce a stationary
frame on screen; they are different machines. Sticky keeps the document as
one tall scroll surface (URL-fragment jumps, print, reader modes all see one
page); the app-frame model gives each region its own scroll container.

**Fix.** The app-frame model won: shell `block-size: 100dvh; overflow:
clip`, canvas `overflow: auto`. Two reasons. (1) The rule is the landed
spec; the exhibit is "mock styles throughout — a UX reference, not an
implementation". (2) Composed layouts (P-5 explorer: rail / well / inspector
with independent scroll) need region-owned scroll anyway — starting sticky
would mean re-fighting this at P-5 with more furniture on the board.
Consequence accepted: in-page anchor jumps scroll the canvas region, not the
document; the skip link targets the canvas element and focuses it directly.

## 3 — `min-content` column vs the theme `<select>` in the collapsed rail (P-4.1)

**What.** The rail column is `min-content`, so the rail's width is the max
of its children's min-content sizes. In the sanctioned collapse the labels
hide and the rail should shrink to its icons — but the ThemeSelector is a
`<select>` whose min-content width is its longest option label. The intrinsic
model faithfully reported that truth and refused to narrow the rail below
the select.

**Fix.** A bounded surrender inside the one sanctioned reflow: the collapsed
rail takes an explicit `inline-size: 4rem` (a Rail-local metric, not one of
the four frame tokens) and the select gets `inline-size: 100%`, truncating
its text rather than propping the rail open. Hiding the select entirely was
rejected (an invisible-but-focusable or absent control is worse than a
truncated one). The clean end-state is an icon-sized theme toggle button —
noted for the utility-cluster refinement, not built here.

**Why logged.** First concrete instance of the general lesson: intrinsic
sizing surfaces every child's honest minimum, so ONE unbounded child governs
a whole `min-content` track. Fix the child (or bound the track in the
sanctioned reflow); never swap the template.

## 4 — The strip band: A.06 §2's "present only when" vs AX.6's stationary frame (P-4.1)

**What.** A grid-rows fight. A.06 §2 says the mode strip is "present only
when the mode declares `controls` or `status`"; AX.6 says nothing outside
the canvas moves on a lens switch. With v1 lenses mixed (explorer dense,
lobby empty), an appearing/disappearing strip row would bounce the canvas
plate vertically on every lens switch — the exact jump AX.6 exists to kill.

**Fix.** The viewport keeps its `min-content 1fr min-content` rows with the
strip row ALWAYS present (`min-block-size: var(--strip-h)`, empty sockets),
reading §2 as governing strip CONTENT (which mode gets to put what in the
band) and AX.6 as governing the BAND (frame geometry). The exhibit supports
this reading: its `.strip` never unmounts; only the per-mode `sgroup`s
toggle. Measured consequence: the five lens frames are byte-identical
(modulo the router's own `aria-current`) through the real SSR pipeline —
`frameStability.tests.tsx` pins it.

## 5 — `container-type` makes the canvas a containing block: the fixed/sticky trap (P-4.1)

**What.** `.shell-canvas` carries `container-type: inline-size` (AX.1
container-driven intrinsics) — and size containment of any axis establishes
LAYOUT containment, so the canvas becomes the containing block for
`position: fixed` and `position: absolute` descendants. Today's overlays
(Tooltip, Popover, ContextualMenu) survive only because they portal to
`document.body`, outside the canvas subtree; `TooltipArea` portals to
`parentElement || document.body`, so a consumer passing an in-canvas
`parentElement` gets canvas-relative fixed math. Any future bare in-canvas
`position: fixed` element — a FAB, a floating inspector — silently anchors
to the canvas box instead of the viewport, and `position: sticky` semantics
shift under the same containment.

**Fix.** Keep the query container: container-driven intrinsics are
load-bearing for AX.1 (components inside respond to the REGION's width,
never the viewport's). The recorded law instead: in-canvas `fixed`/`sticky`
must not assume the viewport. Overlays keep portalling to `document.body`;
anything that wants viewport anchoring must live — or portal — outside the
canvas subtree.

**Why logged.** A preemption with no alarm attached: a bare fixed element
inside the canvas renders happily, just anchored to the wrong box, and
nothing warns until the first floating tenant arrives (P-5's inspector is
the likely candidate). The law is written down before there is a corpse.

## 6 — The entity aside wanted a container query; the census said no (P-5)

**What.** The component entity view is a two-tenant row: reading column
west, quick-facts aside east (`--aside-w`). The obvious modern move is a
`@container canvas (inline-size < …)` rule that stacks the aside under the
article on narrow canvases — the canvas is even a named query container
already. But the at-rule census (`frameStability.tests.tsx`) sanctions
exactly ONE layout-capable conditional in the app, the Rail collapse, and
a second one would erode the AX.1 posture one "just this once" at a time.

**Fix.** Flex, intrinsically: the body is `display: flex; flex-wrap: wrap`,
the article `flex: 1 1 32rem; min-inline-size: 0`, the aside
`flex: 0 1 var(--aside-w); min-inline-size: 0`. On a wide canvas both fit
on the row and the aside holds its token basis; as the canvas narrows the
aside first SHRINKS (flex-shrink 1 — no scrollbar), and when the article
can no longer make its 32rem basis the wrap breaks the aside below it.
The breakpoint emerges from content bases, not from a viewport or
container measurement — the collapse point is wherever `32rem + gap +
aside` stops fitting, which is the honest intrinsic answer.

**Why logged.** The first composed-layout tenant to CONSUME `--aside-w`
(AX.6's "regions consume, never re-define" finally has a consumer), and
the precedent for every future two-column mode: reach for wrap + basis
before asking the census for a second conditional.

## 7 — The catalog's column count is nobody's decision (P-5)

**What.** The components catalog wants a responsive card grid: four
columns on a wide canvas, one on a phone. The breakpoint-table reflex
would write three `@media` rules; the census forbids all of them, and
the frame's whole posture (AX.1) says the canvas REGION, not the
viewport, is the only honest width.

**Fix.** Two grids, both intrinsic. The composed layout is
`grid-template-columns: var(--subnav-w) minmax(0, 1fr)` — the west
column is the frame's token (consumed, never re-defined; the census
counts definitions), the east column releases its min-content claim so a
wide card row can never prop the frame open (the entry-1 lesson,
re-applied one level down). Inside, the cards run
`repeat(auto-fill, minmax(15rem, 1fr))`: the column count falls out of
whatever width the canvas actually has — rail collapsed or not, aside or
no aside — with no rule anywhere deciding it. `15rem` is the one
authored number: the narrowest a card can be before its clamped summary
teaser stops being readable.

**Why logged.** The exhibit case for "the template never changes, only
the space does": the same stylesheet serves every canvas width the shell
can produce, and the only conditional at-rule in the app is still the
rail's sanctioned collapse.

## 8 — The definitions triptych rides the frame's tokens; its collapse is a debt on record (P-5)

**What.** The Definitions explorer is the first THREE-panel composed
layout: rail | well | inspector. Its grid is
`minmax(var(--subnav-w), 16rem) minmax(0, 1fr) minmax(var(--aside-w),
24rem)` — the frame's tokens as the outer columns' minima (consumed,
never re-defined; the census counts definitions), preferred maxima
authored here (16rem / 24rem), and the centre releasing its min-content
claim (the entry-1 lesson, again one level down: the graph canvas must
never prop the frame open). Tension, recorded for the owner's retune:
the 13rem/16rem rail and 16rem/24rem aside pairs are this pass's
judgement calls, and they sit beside the ds:grid exhibits' 14rem/20rem
figures — no ruling reconciles them yet.

**The collapse debt.** Below ~29rem-plus-gaps of canvas the triptych
cannot fit; the census (one sanctioned conditional, the Rail's) bans a
mode-level `@container` stack, and a wrap-based collapse (entry 6's
move) is unusable here because the WELL must keep its block-size while
wrapping would interleave the panels. The honest consequence shipped:
the triptych overflows into the canvas region's own scroll on a
too-narrow canvas. If a real narrow-canvas need materialises, the fix is
a ruling (a second sanctioned conditional or a stacked variant), not a
quiet at-rule.

**Panel scroll.** The release chain now has a fourth link: canvas row →
page (`grid-template-rows: min-content minmax(0, 1fr)`, `block-size:
100%`) → explorer (`min-block-size: 0`) → rail/inspector (`overflow:
auto; min-block-size: 0`). The well deliberately does NOT scroll as a
box — React Flow pans inside it; `overflow: hidden` keeps the depression
from ever growing a scrollbar of its own.

## 9 — React Flow in the underground well: absolute is fine, fixed would lie (P-5)

**What.** The hierarchy well mounts `@xyflow/react` v12 inside the
canvas — the first third-party layout tenant, and the first tenant of
entry 5's recorded law: the canvas's `container-type` makes it the
containing block for `position: fixed` descendants. React Flow positions
everything ABSOLUTELY inside its own wrapper (verified: zero
`position: fixed` in its shipped stylesheets, attribution included), so
the containment law holds without exceptions. Its stylesheet lives in
node_modules — outside the at-rule census's `src/**/*.css` glob, which
is the census's own stated scope (package CSS is exempt; the app's
override css here adds zero conditional at-rules).

**SSR.** No grid fight, but a determinism one, logged for the record:
v12 renders the full node DOM server-side ONLY when nodes carry
explicit `width`/`height` (plus `handles` for server-computed edge
paths), so the layout is a pure function (`buildClassTree`) and the
initial camera is a constant `defaultViewport` — never `fitView`, which
measures. A measured anything in this path would be a hydration
mismatch, which the hydration suite gates.

---

## Round notes (P-4.1 review)

One-line rulings that need a record but not a fight entry:

- **Utility cluster scope.** v1's cluster (Playground · Demo sign-in ·
  Theme) is scoped to routes that exist; A.06 §3's Contribute / API-channel
  / help entries land when their targets do.
- **Collapse stage 2.** The spec's drawer stage is deferred — it would need
  a second viewport MQ (breaking the AX.1 single-collapse certification) or
  JS, and no narrow-viewport need is proven yet.
