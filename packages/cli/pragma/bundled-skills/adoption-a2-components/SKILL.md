---
name: adoption-a2-components
description: Swap an application's UI to Canonical design-system components one component type per PR (adoption track A2); also runs as a guided tutorial on a worked example
---

# Adoption A2 — Components

The second adoption track: replace the app's existing UI elements with design-system
components. Prerequisite: track A1 is done — styles, fonts, and icons are live, so
swapped components land on the right foundation. That includes the root context and
density classes (`class="app comfortable"` — A1's "Declare the surface" section):
component geometry reads the `--density-*` channel those classes emit, and a swap onto
a class-less root looks subtly wrong rather than broken.

## When to Use

- Track A1 is done and the app's UI elements should become design-system components
- Planning or executing a component swap PR

## When NOT to Use

- The visual foundation is not in place — run `adoption-a1-styles` first
- Migrating forms — a different programming model: `adoption-a3-forms`

(An uncovered component TYPE is not a reason to skip the track — it is a per-type
finding: see "The covered set is queried live" below.)

## Opening move: ask, or offer the tutorial

Activation is an opening, not a starting gun. Unless the first message already names
the work, ask for the starting point — as a suggestion carrying an example, not as a
form to fill in:

> To get started, point me at the app and say which component type you'd like swapped
> first — buttons, say — or let me inventory the app and suggest one.

The inventory is cheap, so no preference is a fine answer. Ask again only for what the
next step genuinely blocks on.

If the activation message already carries the starting point, do not re-ask — say what
you took it to be, and go.

Offer the tutorial in the same breath, because this track doubles as one:

> Or if you'd rather see what a swap looks like before touching your app, I can run it
> as a tutorial: I'll take a plausible example — buttons in a small React app — and
> walk you through one type from inventory to a finished PR.

Tutorial mode is the step narration below, turned up: the same outcome-path-conclusion
frame, with the reasoning behind each change made explicit. It runs on a scratch
example, not on the person's app — nothing in their repo changes unless they ask.

## Every step is narrated: outcome, path, conclusion

Every step is addressed to the person — once before it runs, once when it ends. This is
not tutorial manner. It holds in the ordinary flow too: the person is the design
authority, and they can only steer a step they saw coming. A decision gate met cold is
a decision they cannot really make.

**Open** the step with what it is FOR — the outcome it should leave behind — and how
you are about to get there. **Close** it with a sentence saying what it established and
what that means for the step after. One sentence each is enough; the failure mode is
silence, not length, and a step whose outcome looks obvious still gets its sentence
rather than a shrug.

Do:

> **Inventory first.** The outcome is a real count of what the app uses, per component
> type, so the first swap PR is chosen from evidence rather than instinct. The path is
> the greps below over `src/`, deduped with counts.
>
> …
>
> So: 43 button call sites against 6 cards — buttons are the widest swap and the
> obvious first PR, and two of those call sites use a variant the system has no
> modifier for, which is a finding to report rather than a blocker.

Don't:

> Inventory: 43 buttons, 6 cards, 3 tooltips.

Both carry the same facts. Only the first says what the step was trying to achieve and
what it settled — and only the first lets the person cut in with the thing they know
and the graph does not, which is the whole reason they are here.

## Asked about the skill: methodology and outcomes first

A question about what this skill does — what it covers, what its steps are, how it
works — is answered in that order: the METHOD it applies and the OUTCOMES it leaves
the person holding come first, the step-by-step breakdown comes after.

Two or three sentences of method is enough: what the skill treats as its object, the
discipline that makes it work, and what exists at the end that did not exist before.
The enumeration then reads as steps in service of something, rather than as a list to
be got through.

What this prevents is a table of contents standing in for an answer. A reply opening
with the step names tells someone who already knows the skill nothing new, and someone
who does not, nothing at all.

So, asked what this skill is:

> It replaces the app's UI elements with design-system components, one component type
> per PR, with the order chosen from a real inventory rather than instinct. You end
> with each swapped type sitting on A1's foundation, accessibility warnings treated as
> contract, and any type the system does not cover reported as a finding rather than
> treated as a blocker.

Then, and only then, the breakdown.

## Install

```bash
bun add @canonical/react-ds-global
```

That is the universal (global) tier package. App-tier siblings, where they exist,
follow a naming convention — the mapping is convention, not a graph field:
`@canonical/<framework>-ds-global` for the `global` tier, `-ds-app` for the shared
`apps` tier, and `-ds-app-<app>` for an app-specific tier (so the `apps_lxd` tier
installs `@canonical/react-ds-app-lxd`). The `<app>` segment is the package's own
short name, not always the tier suffix (the `apps_workplaceengineering` tier's
package is `@canonical/svelte-ds-app-wpe`) — `pragma tier list` shows which tiers
exist, and the derived package name must resolve before you install it. Tiers
outside `global`/`apps*` have no package convention today: there the target package
is a decision to raise, not to derive.

```tsx
import { Button, Badge, Card, Tooltip } from "@canonical/react-ds-global";
```

Named imports; components accept the underlying element's native HTML attributes, so
existing `onClick`/`aria-*`/`data-*` plumbing carries over.

## Code standards are the gate

Every swap writes component code, and that code falls under the live code standards —
the target framework's category (`react`, `svelte`, `lit`), plus `testing` and
`storybook` where the swap touches those (take the actual set from the live output,
not from this list). Pull them BEFORE the first swap of a PR and hold the Do/Don't
pairs open while writing:

```bash
pragma standard categories                 # the live category set — never from memory
pragma standard list --category react      # swap react for the target framework
pragma standard lookup <name> --detail detailed
```

Apps follow the code standards as closely as the swap allows. Where swapped code has
to deviate from a pulled standard, record the deviation in the PR next to the
standard's name — "the old code did it this way" is a deviation to record, not a
reason to stay silent — and ideally file it as an issue, either to bring the app into
line later or to propose a change to the standard itself. The standards apply even
when the app has no pragma dependency, and they are open to contribution: a missing
or wrong standard is something to propose a change for, not to silently work around.

## Inventory first (grep, don't guess)

Build the swap list from the code, not from memory:

```bash
grep -rhoE '\bp-[a-z0-9-]+' src/ | sort | uniq -c | sort -rn   # Vanilla class inventory, deduped with counts
grep -rn 'from "@canonical/react-components"' src/             # or your current component library's import
```

Group the hits by component TYPE — all buttons, all cards, all tooltips — because the
type is the unit of work below. When you get to one type, locate its call sites with an
anchored grep:

```bash
grep -rnE '\bp-button\b' src/   # swap p-button for the type at hand
```

Anchor on the class TOKEN, not on the attribute — a `class(Name)?="…"` pattern
under-collects, missing template-literal (`` className={`p-button …`} ``), `clsx(…)`,
and single-quoted call sites.

## The covered set is queried live

Before swapping a type, confirm the design system covers it TODAY:

```bash
pragma block list            # what exists, with tiers
pragma block lookup <Name>   # anatomy, modifiers, properties (MCP: block_lookup)
```

A bare name can match blocks in several tiers, and `block lookup` silently picks
one — it resolves `ds:name` globally and cannot be steered to a tier.
Confirm the tier the lookup picked from its own `- Tier:` line; the name query below lists every tier that carries the name.
The name query
`pragma graph query "SELECT ?b WHERE { ?b ds:name ?n . FILTER(LCASE(?n) = LCASE('<Name>')) }"`
prints every tier's IRI for `pragma graph inspect <IRI>`. If the lookup picked the wrong
tier's block, read the one you want with `pragma graph inspect <IRI from that row>`
instead.

**A block being in the graph does not mean the package exports it.** The graph
records what the design system has DOCUMENTED; the package ships what has been
BUILT, and the two run ahead of each other in both directions. So before you
swap a type, confirm the named export in the package you installed:

```bash
node -e "console.log(Object.keys(require('@canonical/react-ds-global')))" | tr ',' '\n' | grep -i '<Name>'
```

If the export is absent, the block is documented but not available — file the
gap and leave the existing markup in place. Do not infer availability from a
Storybook story either: a story can exist for a block that ships no
implementation and no export, so a story CORROBORATES an export you have
already confirmed, and never substitutes for it.

If the name has no row and the lookup errors, the block may be a Group — `block list`/`block lookup` cover no groups; the name query above returns its IRI for `pragma graph inspect <IRI>`.
Run it before calling a type uncovered: `Cards` and `KeyboardKeys` are groups, and both
ship from the `@canonical/react-ds-global` this track installs. The export check above
applies to them exactly as it does to any other block.

Then check the component in a running Storybook — your app's own (track A1 set it up
via `@canonical/storybook-config`), your team's hosted hub, or `bun run storybook`
inside the component's package in the pragma monorepo (e.g. `packages/react/ds-global`
— the monorepo root has no such script).

> The covered set is whatever the graph answers today. Query it live — never copy its
> output into documentation, PRs, or this skill.

A gap found is a FINDING to report (and a `specify-component` candidate) — skip that
type and keep swapping the types the system does cover; never hand-roll a lookalike
silently.

## One component type per PR

The swap unit is a component TYPE across the app — all buttons in one PR — not a page.

- Diffs stay reviewable: one decision, applied everywhere.
- Accessibility regressions stay attributable to the one swap that caused them.
- One PR reverts one decision, cleanly.

## Names and boundaries changed vs Vanilla

Do NOT assume a 1:1 mapping from Vanilla names and `p-*` classes. Boundaries moved:
what was one blob may now be a component plus subcomponents (e.g. `Accordion` with
`Accordion.Item`), and icon semantics changed to `currentColor`. The block's `ds:usage`
When-to-use / When-not-to-use guidance decides what replaces what — read it with
`pragma graph inspect <block IRI>` (the IRI from the block's `pragma block list` row;
`block lookup` does not render the usage field today) — often the honest swap is a
DIFFERENT component than the old name suggests.

## Accessibility warnings are contract

The components warn in dev mode when misused — for example, an icon-only `Button`
without `aria-label`/`aria-labelledby` logs a console warning, and icons are
decorative/aria-hidden unless labelled. Treat every such warning as a FAILED acceptance
criterion of the swap PR: fix the usage, never silence the warning.

Modifier props (e.g. `anticipation="constructive"` on `Button`) take their values from
modifier families — read them live, list first:

```bash
pragma modifier list             # every family with its values
pragma modifier lookup <Family>  # one family in full — take the name from the list output
```

The families a block draws from print as the last column of its `pragma block list`
row, and in full on the block itself via `pragma graph inspect <IRI from that row>`
(the `ds:hasModifierFamily` triples). Mapping a family to code follows two rules: the
React prop IS the family name lowercased (`Anticipation` → `anticipation`), and the
prop's values are the family's values lowercased with spaces as underscores
(`In Progress` → `in_progress`) — the lookups print display casing; the code takes
the lowercase form. A family listed on the block may have no prop on the component
yet — check the component's types before writing it.

## Verify per PR

- [ ] Root context and density classes present (track A1) — swapped components size
      from the `--density-*` channel, not from luck.
- [ ] Zero dev-console warnings from the swapped components.
- [ ] Keyboard pass on each swapped instance (focus, activation, escape where relevant).
- [ ] Visual pass against the component's Storybook stories.

## Next

Forms are their own programming model — continue with `adoption-a3-forms`.

## Support

If this skill leads somewhere broken — a command that errors, guidance that
contradicts what the live system answers, a gap the flow cannot cover — you are not
stuck:

- Raise an issue in the pragma repo: https://github.com/canonical/pragma/issues —
  include the skill name, what was run, and expected vs. actual outcome.
- Or contact the design-system team owners directly through your organization's
  professional messaging channels for assistance.
